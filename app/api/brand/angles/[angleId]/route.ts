import { NextResponse } from "next/server";
import { deleteAngle, saveAngle } from "@/lib/brand-intelligence";

type RouteContext = { params: Promise<{ angleId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { angleId } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveAngle>[0];
    const angle = await saveAngle({ ...body, id: angleId });
    return NextResponse.json({ ok: true, angle });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { angleId } = await context.params;
  const removed = await deleteAngle(angleId);
  if (!removed) return NextResponse.json({ error: "Angle not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
