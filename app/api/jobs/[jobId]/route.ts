import { getExecutionJob, listExecutionEvents } from "@/lib/db/execution-jobs-db";
import { notFoundError, successResponse } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = await getExecutionJob(jobId);

  if (!job) {
    return notFoundError("Job not found.");
  }

  const events = await listExecutionEvents(jobId, 25);

  return successResponse({
    job,
    events,
    status: job.status,
    retryCount: job.retryCount,
    maxRetries: job.maxRetries,
    failureReason: job.errorMessage,
    generationRunId: job.generationRunId,
    jobType: job.jobType,
    payload: job.payload,
    timestamps: {
      scheduledFor: job.scheduledFor,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      updatedAt: job.updatedAt,
    },
  });
}
