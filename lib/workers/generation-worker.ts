import { appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import { runGeneration } from "@/lib/generation-runner";
import type { GenerationJobPayload, WorkerResult } from "@/lib/workers/worker-types";

export async function runGenerationWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as GenerationJobPayload;
  const idea = typeof payload.idea === "string" ? payload.idea.trim() : "";

  if (!idea) {
    throw new Error("Generation job payload is missing an idea.");
  }

  await appendExecutionEvent(job.id, "assembling_context", "Preparing generation context");
  await appendExecutionEvent(job.id, "running_python", "Running generation engine");

  const result = await runGeneration(idea);

  if (!result.ok) {
    throw new Error(result.error ?? "Generation failed.");
  }

  await appendExecutionEvent(job.id, "persisting_artifact", "Generation output persisted");

  return {
    runId: result.runId,
    stdout: result.stdout.slice(0, 2000),
    stderr: result.stderr.slice(0, 2000),
  };
}
