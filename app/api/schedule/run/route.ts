import { updateScheduleConfig } from "@/lib/schedule-config";
import { runGeneration } from "@/lib/generation-runner";
import { errorResponse, successResponse, validationError } from "@/lib/http/api-response";

export const maxDuration = 300;

export async function POST(request: Request) {
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
