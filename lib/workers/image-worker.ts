import { appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import type { ChannelJobPayload, WorkerResult } from "@/lib/workers/worker-types";

export async function runImageWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as ChannelJobPayload;
  await appendExecutionEvent(job.id, "generating_image", "Image generation worker reserved", payload);
  throw new Error("Image generation is queued, but its heavy handler still requires the executeNow compatibility path.");
}
