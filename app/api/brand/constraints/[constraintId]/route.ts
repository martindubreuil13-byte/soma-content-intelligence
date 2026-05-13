import { NextResponse } from "next/server";
import { deleteNegativeConstraint, saveNegativeConstraint } from "@/lib/brand-intelligence";

type RouteContext = { params: Promise<{ constraintId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { constraintId } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveNegativeConstraint>[0];
    const constraint = await saveNegativeConstraint({ ...body, id: constraintId });
    return NextResponse.json({ ok: true, constraint });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { constraintId } = await context.params;
  const removed = await deleteNegativeConstraint(constraintId);
  if (!removed) return NextResponse.json({ error: "Constraint not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
