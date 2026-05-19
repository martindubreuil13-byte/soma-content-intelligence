import { errorResponse, successResponse, unauthorizedError } from "@/lib/http/api-response";
import { runNextExecutionJob } from "@/lib/workers/worker-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("dev") === "1") return true;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedError();

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { maxJobs?: unknown };
  const maxJobsParam = Number(url.searchParams.get("maxJobs") ?? body.maxJobs ?? 1);
  const maxJobs = Number.isFinite(maxJobsParam) ? Math.min(Math.max(1, maxJobsParam), 3) : 1;
  const result = await runNextExecutionJob({ maxJobs });

  if (result.ok === false) {
    return errorResponse("Worker run failed.", { status: 500, code: "worker_failed", details: result });
  }

  return successResponse(result);
}

export async function GET(request: Request) {
  return POST(request);
}
