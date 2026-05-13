import { NextResponse } from "next/server";
import { deleteCTAStyle, saveCTAStyle } from "@/lib/brand-intelligence";

type RouteContext = { params: Promise<{ ctaId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { ctaId } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveCTAStyle>[0];
    const cta = await saveCTAStyle({ ...body, id: ctaId });
    return NextResponse.json({ ok: true, cta });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { ctaId } = await context.params;
  const removed = await deleteCTAStyle(ctaId);
  if (!removed) return NextResponse.json({ error: "CTA style not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
