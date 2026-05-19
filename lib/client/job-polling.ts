import { safeJsonFetch } from "@/lib/client/fetch-safe";
import type { ExecutionEvent, ExecutionJob } from "@/lib/db/execution-jobs-db";

export type ExecutionJobSnapshot = {
  job: ExecutionJob;
  events: ExecutionEvent[];
};

type PollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  onUpdate?: (snapshot: ExecutionJobSnapshot) => void;
};

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);

export async function pollExecutionJob(jobId: string) {
  return safeJsonFetch<ExecutionJobSnapshot>(`/api/jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
}

export async function waitForJobCompletion(jobId: string, options: PollOptions = {}) {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await pollExecutionJob(jobId);

    if (!result.ok) {
      return result;
    }

    options.onUpdate?.(result.data);

    if (terminalStatuses.has(result.data.job.status)) {
      return result;
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  return {
    ok: false as const,
    error: { message: "The job is still running. Check back in a moment.", code: "job_timeout" },
  };
}
