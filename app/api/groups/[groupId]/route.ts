import { NextResponse } from "next/server";
import { deleteGroupTarget, updateGroupTarget } from "@/lib/group-targets";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  if (!groupId) return NextResponse.json({ error: "Missing groupId." }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : undefined;
    const url = typeof body.url === "string" ? body.url.trim().slice(0, 500) : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : undefined;

    const updated = await updateGroupTarget(groupId, { name, url, isActive, notes });
    if (!updated) return NextResponse.json({ error: "Group not found." }, { status: 404 });

    return NextResponse.json({ ok: true, target: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const removed = await deleteGroupTarget(groupId);
  if (!removed) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
