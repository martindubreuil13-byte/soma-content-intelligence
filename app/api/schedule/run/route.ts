import { NextResponse } from "next/server";
import { updateScheduleConfig } from "@/lib/schedule-config";
import { runGeneration } from "@/lib/generation-runner";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const idea =
    typeof body.idea === "string" && body.idea.trim()
      ? body.idea.trim()
      : `Manual generation run — ${new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}`;

  console.log("[schedule/run] starting manual generation");

  const result = await runGeneration(idea);

  await updateScheduleConfig({ lastRunAt: new Date().toISOString() }).catch(() => {});

  if (!result.ok) {
    console.error("[schedule/run] generation failed", { error: result.error, stderr: result.stderr?.slice(0, 300) });
    return NextResponse.json(
      { error: result.error ?? "Generation failed.", stderr: result.stderr },
      { status: 500 }
    );
  }

  console.log("[schedule/run] generation complete", { runId: result.runId });
  return NextResponse.json({
    ok: true,
    runId: result.runId,
    stdout: result.stdout.slice(0, 2000),
  });
}
