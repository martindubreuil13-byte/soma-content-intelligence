import { NextResponse } from "next/server";
import { readScheduleConfig, updateScheduleConfig } from "@/lib/schedule-config";
import { runGeneration } from "@/lib/generation-runner";
import {
  acquireSchedulerLock,
  markSchedulerFailure,
  releaseSchedulerLock,
  updateSchedulerHeartbeat,
} from "@/lib/db/scheduler-runtime-db";
import { runInlineExecutionJob } from "@/lib/orchestration/execution-orchestrator";
import type { ScheduleConfig } from "@/lib/autopilot-types";

export const dynamic = "force-dynamic";
// Allow up to 5 minutes — Python generation typically takes 2–3 min.
// On Vercel Hobby the cap is 60s; set PYTHON_BIN to a fast path or upgrade plan for scheduled runs.
export const maxDuration = 300;

type TickResult = {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  runId?: string | null;
  error?: string;
  log: string[];
};

// ─── isDue logic ──────────────────────────────────────────────────────────────

function isDue(config: ScheduleConfig): { due: boolean; reason: string } {
  if (!config.isEnabled) {
    return { due: false, reason: "schedule disabled" };
  }
  if (!config.runTime) {
    return { due: false, reason: "no runTime configured" };
  }

  const [hStr, mStr] = config.runTime.split(":");
  const targetH = Number(hStr);
  const targetM = Number(mStr);
  if (isNaN(targetH) || isNaN(targetM) || targetH > 23 || targetM > 59) {
    return { due: false, reason: `invalid runTime "${config.runTime}"` };
  }

  const now = new Date();
  const tz = config.timezone || "UTC";

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const p = (type: string) =>
    Number(parts.find((x) => x.type === type)?.value ?? "0");

  const curH = p("hour");
  const curM = p("minute");
  const tzDay = p("day");
  const tzMonth = p("month");
  const tzYear = p("year");

  const hh = String(curH).padStart(2, "0");
  const mm = String(curM).padStart(2, "0");

  const pastRunTime =
    curH > targetH || (curH === targetH && curM >= targetM);

  if (!pastRunTime) {
    return {
      due: false,
      reason: `not yet — waiting until ${config.runTime} ${tz} (currently ${hh}:${mm} ${tz})`,
    };
  }

  // Check if it has already run today in the target timezone
  if (config.lastRunAt) {
    const lastRun = new Date(config.lastRunAt);
    const lastParts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(lastRun);
    const lp = (type: string) =>
      Number(lastParts.find((x) => x.type === type)?.value ?? "0");

    if (
      lp("day") === tzDay &&
      lp("month") === tzMonth &&
      lp("year") === tzYear
    ) {
      return {
        due: false,
        reason: `already ran today — lastRunAt ${config.lastRunAt}`,
      };
    }
  }

  return { due: true, reason: `past ${config.runTime} ${tz}, not yet run today` };
}

// ─── Scheduler tick ──────────────────────────────────────────────────────────

async function runSchedulerTick(force: boolean): Promise<TickResult> {
  const log: string[] = [];
  const schedulerKey = "content_generation";

  log.push(`[scheduler] tick at ${new Date().toISOString()}`);

  const config = await readScheduleConfig();
  log.push(
    `[scheduler] config — enabled=${String(config.isEnabled)} runTime=${config.runTime} tz=${config.timezone} lastRunAt=${config.lastRunAt ?? "never"}`
  );

  if (!force) {
    const { due, reason } = isDue(config);
    log.push(`[scheduler] isDue=${String(due)} — ${reason}`);
    if (!due) {
      return { skipped: true, reason, log };
    }
  } else {
    log.push("[scheduler] force=true — bypassing time check");
  }

  const lock = await acquireSchedulerLock(schedulerKey, 300);
  if (!lock.acquired) {
    log.push("[scheduler] skipped — scheduler lock is already active");
    return { skipped: true, reason: "scheduler already running", log };
  }

  log.push("[scheduler] starting generation");

  const idea = `Scheduled generation — ${new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`;

  await updateSchedulerHeartbeat(schedulerKey, 300);
  const result = await runGeneration(idea).catch(async (error) => {
    const message = error instanceof Error ? error.message : "generation threw unexpectedly";
    await markSchedulerFailure(schedulerKey, message);
    return { ok: false, runId: null, error: message, stderr: "" };
  });

  if (result.ok && result.runId) {
    log.push(`[scheduler] generation succeeded — runId: ${result.runId}`);
    await releaseSchedulerLock(schedulerKey, { run_id: result.runId });
  } else {
    log.push(`[scheduler] generation failed — ${result.error ?? "unknown error"}`);
    if (result.stderr) {
      log.push(`[scheduler] stderr: ${result.stderr.slice(0, 400)}`);
    }
    await markSchedulerFailure(schedulerKey, result.error ?? "unknown scheduler generation error", {
      stderr: result.stderr?.slice(0, 1000) ?? "",
    });
  }

  // Update lastRunAt regardless of success/failure.
  // This prevents repeated auto-retries on the same day; use the manual trigger to retry.
  await updateScheduleConfig({ lastRunAt: new Date().toISOString() });
  log.push("[scheduler] lastRunAt updated");

  return {
    ok: result.ok,
    runId: result.runId,
    ...(result.error ? { error: result.error } : {}),
    log,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  // ?dev=1 — skip auth and time check (for local development testing)
  const isDev = url.searchParams.get("dev") === "1";
  // ?force=1 — skip time check but still require auth
  const force = isDev || url.searchParams.get("force") === "1";

  // CRON_SECRET auth guard (optional but recommended for production).
  // Set CRON_SECRET env var and add "Authorization: Bearer <secret>" to vercel.json cron headers.
  // Skipped when ?dev=1 for local development convenience.
  if (!isDev) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  const result = await runInlineExecutionJob(
    {
      jobType: "scheduler_tick",
      payload: { force, dev: isDev },
      priority: 40,
      maxRetries: 1,
    },
    async () => runSchedulerTick(force)
  )
    .then(({ job, result }) => ({ ...result, executionJobId: job.id, executionStatus: job.status }))
    .catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : "Scheduler tick failed.",
      log: ["[scheduler] execution job failed"],
    }));

  console.log("[cron/scheduler]", result.log.join(" | "));

  return NextResponse.json(result, { status: result.ok === false ? 500 : 200 });
}
