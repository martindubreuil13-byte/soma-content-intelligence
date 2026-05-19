import {
  acquireNextExecutionJob,
  appendExecutionEvent,
  createExecutionJob,
  markExecutionJobCompleted,
  markExecutionJobFailed,
  markExecutionJobRunning,
  type CreateExecutionJobInput,
  type ExecutionJob,
} from "@/lib/db/execution-jobs-db";
import { runGeneration } from "@/lib/generation-runner";

type JsonObject = Record<string, unknown>;

export type ExecutionHandlerResult = JsonObject;
export type ExecutionHandler = (job: ExecutionJob) => Promise<ExecutionHandlerResult>;

function workerId(prefix = "inline") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Execution job failed.";
}

const defaultHandlers: Record<string, ExecutionHandler> = {
  generation: async (job) => {
    const idea = typeof job.payload.idea === "string" ? job.payload.idea : "";
    if (!idea.trim()) throw new Error("Generation job payload is missing idea.");
    const result = await runGeneration(idea);
    if (!result.ok) throw new Error(result.error ?? "Generation failed.");
    return {
      runId: result.runId,
      stdout_excerpt: result.stdout.slice(0, 2000),
      stderr_excerpt: result.stderr.slice(0, 2000),
    };
  },
  caption_regeneration: async () => {
    throw new Error("Caption regeneration worker handler is not extracted yet; route uses inline lifecycle wrapper.");
  },
  image_generation: async () => {
    throw new Error("Image generation worker handler is not extracted yet; route uses inline lifecycle wrapper.");
  },
  visual_regeneration: async () => {
    throw new Error("Visual regeneration worker handler is not extracted yet; route uses inline lifecycle wrapper.");
  },
};

export async function enqueueExecutionJob(input: CreateExecutionJobInput): Promise<ExecutionJob> {
  return createExecutionJob(input);
}

export async function runInlineExecutionJob<T extends JsonObject>(
  input: CreateExecutionJobInput,
  execute: (job: ExecutionJob) => Promise<T>
): Promise<{ job: ExecutionJob; result: T }> {
  const job = await createExecutionJob(input);
  const id = workerId();

  await markExecutionJobRunning(job.id, id);

  try {
    await appendExecutionEvent(job.id, "handler_started", "Inline handler started");
    const result = await execute(job);
    const completed = await markExecutionJobCompleted(job.id, result);
    return { job: completed, result };
  } catch (error) {
    const message = normalizeError(error);
    const failed = await markExecutionJobFailed(job.id, message, { worker_id: id });
    throw Object.assign(new Error(message), { executionJob: failed });
  }
}

export async function runNextExecutionJob(handlers: Record<string, ExecutionHandler> = defaultHandlers) {
  const id = workerId("worker");
  const job = await acquireNextExecutionJob(id);

  if (!job) {
    return { ok: true, idle: true };
  }

  const handler = handlers[job.jobType];
  if (!handler) {
    const failed = await markExecutionJobFailed(job.id, `No handler registered for ${job.jobType}`, { worker_id: id });
    return { ok: false, job: failed };
  }

  try {
    await appendExecutionEvent(job.id, "handler_started", `Worker ${id} started ${job.jobType}`);
    const result = await handler(job);
    const completed = await markExecutionJobCompleted(job.id, result);
    return { ok: true, job: completed };
  } catch (error) {
    const failed = await markExecutionJobFailed(job.id, normalizeError(error), { worker_id: id });
    return { ok: false, job: failed };
  }
}
