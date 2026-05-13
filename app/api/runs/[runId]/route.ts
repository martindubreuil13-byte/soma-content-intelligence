import { rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const runIdPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { runId } = await context.params;

  if (!runIdPattern.test(runId)) {
    return NextResponse.json({ error: "Invalid run id." }, { status: 400 });
  }

  const runPath = path.join(process.cwd(), "outputs", runId);

  try {
    await rm(runPath, { recursive: true, force: true });

    return NextResponse.json({ ok: true, deletedRunId: runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";

    console.error("[runs] Delete failed", {
      runId,
      runPath,
      message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
