import { appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import type { ChannelJobPayload, WorkerResult } from "@/lib/workers/worker-types";

export async function runVisualWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as ChannelJobPayload;
  await appendExecutionEvent(job.id, "generating_visual_prompt", "Visual regeneration worker reserved", payload);
  throw new Error("Visual regeneration is queued, but its heavy handler still requires the executeNow compatibility path.");
}
