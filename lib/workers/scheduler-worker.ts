import { createExecutionJob, appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import { readScheduleConfig, updateScheduleConfig } from "@/lib/schedule-config";
import type { SchedulerJobPayload, WorkerResult } from "@/lib/workers/worker-types";

function isScheduleDue(config: Awaited<ReturnType<typeof readScheduleConfig>>) {
  if (!config.isEnabled) return { due: false, reason: "schedule disabled" };
  if (!config.runTime) return { due: false, reason: "no schedule time configured" };

  const [hourValue, minuteValue] = config.runTime.split(":").map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
    return { due: false, reason: "schedule time is invalid" };
  }

  const now = new Date();
  const timezone = config.timezone || "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const currentHour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const currentMinute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const due = currentHour > hourValue || (currentHour === hourValue && currentMinute >= minuteValue);

  return { due, reason: due ? "schedule is due" : `waiting until ${config.runTime} ${timezone}` };
}

export async function runSchedulerWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as SchedulerJobPayload;
  const force = payload.force === true;
  const config = await readScheduleConfig();
  const due = isScheduleDue(config);

  await appendExecutionEvent(job.id, "scheduler_check", due.reason, { force });

  if (!force && !due.due) {
    return { skipped: true, reason: due.reason };
  }

  const idea = `Scheduled generation — ${new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`;

  const generationJob = await createExecutionJob({
    jobType: "generation",
    priority: 50,
    payload: { idea, source: "scheduled" },
    metadata: { scheduler_job_id: job.id },
  });

  await updateScheduleConfig({ lastRunAt: new Date().toISOString() }).catch(() => {});
  await appendExecutionEvent(job.id, "queued_generation", "Scheduler queued a generation job", {
    generation_job_id: generationJob.id,
  });

  return { queuedGenerationJobId: generationJob.id };
}
