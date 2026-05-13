import { NextResponse } from "next/server";
import { deleteHookStyle, saveHookStyle } from "@/lib/brand-intelligence";

type RouteContext = { params: Promise<{ hookId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { hookId } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveHookStyle>[0];
    const hook = await saveHookStyle({ ...body, id: hookId });
    return NextResponse.json({ ok: true, hook });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { hookId } = await context.params;
  const removed = await deleteHookStyle(hookId);
  if (!removed) return NextResponse.json({ error: "Hook style not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
