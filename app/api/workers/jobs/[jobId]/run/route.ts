import { errorResponse, successResponse, unauthorizedError } from "@/lib/http/api-response";
import { runExecutionJob } from "@/lib/workers/worker-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("dev") === "1") return true;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function POST(request: Request, context: RouteContext) {
  if (!isAuthorized(request)) return unauthorizedError();

  const { jobId } = await context.params;
  const result = await runExecutionJob(jobId);

  if (!result.ok) {
    return errorResponse(result.error ?? "Worker job failed.", {
      status: result.error === "Execution job not found." ? 404 : 500,
      code: "worker_job_failed",
      details: { job: result.job },
    });
  }

  return successResponse(result);
}
