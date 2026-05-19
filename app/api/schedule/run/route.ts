import { updateScheduleConfig } from "@/lib/schedule-config";
import { runGeneration } from "@/lib/generation-runner";
import { createExecutionJob } from "@/lib/db/execution-jobs-db";
import { errorResponse, successResponse, validationError } from "@/lib/http/api-response";

export const maxDuration = 300;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return validationError("Invalid generation request.");

  const idea =
    typeof body.idea === "string" && body.idea.trim()
      ? body.idea.trim()
      : `Manual generation run — ${new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
      })}`;
  const executeNow = body.executeNow === true || url.searchParams.get("executeNow") === "1";

  if (!executeNow) {
    const job = await createExecutionJob({
      jobType: "generation",
      priority: 50,
      payload: { idea, source: "manual" },
      metadata: { trigger: "schedule_manual_run" },
    });

    await updateScheduleConfig({ lastRunAt: new Date().toISOString() }).catch(() => {});

    return successResponse({
      jobId: job.id,
      status: "queued",
    }, { status: 202 });
  }

  const result = await runGeneration(idea);

  await updateScheduleConfig({ lastRunAt: new Date().toISOString() }).catch(() => {});

  if (!result.ok) {
    console.error("[schedule/run] generation failed", { error: result.error, stderr: result.stderr?.slice(0, 300) });
    return errorResponse(result.error ?? "Generation failed. Try again.", {
      status: 500,
      code: "generation_failed",
      details: result.stderr ? { stderr: result.stderr.slice(0, 600) } : undefined,
    });
  }

  return successResponse({
    runId: result.runId,
    stdout: result.stdout.slice(0, 2000),
  });
}
