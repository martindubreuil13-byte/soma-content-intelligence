import {
  acquireNextExecutionJob,
  appendExecutionEvent,
  getExecutionJob,
  markExecutionJobCompleted,
  markExecutionJobFailed,
  markExecutionJobRunning,
  type ExecutionJob,
} from "@/lib/db/execution-jobs-db";
import { normalizeError } from "@/lib/errors/error-normalization";
import { runCaptionWorker } from "@/lib/workers/caption-worker";
import { runGenerationWorker } from "@/lib/workers/generation-worker";
import { runImageWorker } from "@/lib/workers/image-worker";
import { runSchedulerWorker } from "@/lib/workers/scheduler-worker";
import { runVisualWorker } from "@/lib/workers/visual-worker";
import type { RunNextExecutionJobOptions, WorkerHandler } from "@/lib/workers/worker-types";

const handlers: Record<string, WorkerHandler> = {
  generation: runGenerationWorker,
  caption_regeneration: runCaptionWorker,
  image_generation: runImageWorker,
  visual_regeneration: runVisualWorker,
  scheduler_tick: runSchedulerWorker,
};

function createWorkerId(prefix = "worker") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeWorkerError(error: unknown) {
  return normalizeError(error, "Execution job failed.");
}

export async function dispatchExecutionJob(job: ExecutionJob) {
  const handler = handlers[job.jobType];

  if (!handler) {
    throw new Error(`No worker handler is registered for ${job.jobType}.`);
  }

  return handler(job);
}

export async function runExecutionJob(jobId: string, workerId = createWorkerId("manual-worker")) {
  const existingJob = await getExecutionJob(jobId);
  if (!existingJob) return { ok: false, error: "Execution job not found." };
  if (existingJob.status === "completed" || existingJob.status === "cancelled") {
    return { ok: true, job: existingJob, skipped: true };
  }

  const job = await markExecutionJobRunning(jobId, workerId);

  try {
    await appendExecutionEvent(job.id, "started", `Worker ${workerId} started ${job.jobType}`);
    const result = await dispatchExecutionJob(job);
    const completed = await markExecutionJobCompleted(job.id, result);
    return { ok: true, job: completed, result };
  } catch (error) {
    const normalized = normalizeWorkerError(error);
    await appendExecutionEvent(job.id, "failed", normalized.message, {
      code: normalized.code,
      details: normalized.details,
    }).catch(() => {});
    const failed = await markExecutionJobFailed(job.id, normalized.message, {
      worker_id: workerId,
      error_code: normalized.code ?? null,
    });
    return { ok: false, job: failed, error: normalized.message };
  }
}

export async function runNextExecutionJob(options: RunNextExecutionJobOptions = {}) {
  const workerId = options.workerId ?? createWorkerId();
  const maxJobs = Math.max(1, options.maxJobs ?? 1);
  const results = [];

  for (let index = 0; index < maxJobs; index += 1) {
    const job = await acquireNextExecutionJob(workerId, options.staleAfterSeconds);
    if (!job) {
      return { ok: true, idle: results.length === 0, processed: results.length, results };
    }

    try {
      await appendExecutionEvent(job.id, "started", `Worker ${workerId} started ${job.jobType}`);
      const result = await dispatchExecutionJob(job);
      const completed = await markExecutionJobCompleted(job.id, result);
      results.push({ ok: true, job: completed, result });
    } catch (error) {
      const normalized = normalizeWorkerError(error);
      await appendExecutionEvent(job.id, "failed", normalized.message, {
        code: normalized.code,
        details: normalized.details,
      }).catch(() => {});
      const failed = await markExecutionJobFailed(job.id, normalized.message, {
        worker_id: workerId,
        error_code: normalized.code ?? null,
      });
      results.push({ ok: false, job: failed, error: normalized.message });
    }
  }

  return { ok: true, idle: false, processed: results.length, results };
}
