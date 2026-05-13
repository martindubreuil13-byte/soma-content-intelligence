import { NextResponse } from "next/server";
import { isValidQueueStatus, removeFromQueue, updateQueueItem } from "@/lib/publishing-queue";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { itemId } = await context.params;
  if (!itemId) return NextResponse.json({ error: "Missing itemId." }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = isValidQueueStatus(body.status) ? body.status : undefined;
    const scheduledFor = typeof body.scheduledFor === "string" ? body.scheduledFor : undefined;
    const publishedAt = typeof body.publishedAt === "string" ? body.publishedAt : undefined;
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : undefined;

    const updated = await updateQueueItem(itemId, { status, scheduledFor, publishedAt, notes });
    if (!updated) return NextResponse.json({ error: "Item not found." }, { status: 404 });

    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { itemId } = await context.params;
  if (!itemId) return NextResponse.json({ error: "Missing itemId." }, { status: 400 });

  const removed = await removeFromQueue(itemId);
  if (!removed) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
