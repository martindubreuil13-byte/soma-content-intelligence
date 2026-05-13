import { NextResponse } from "next/server";
import { deleteICP, saveICP } from "@/lib/brand-intelligence";

type RouteContext = { params: Promise<{ icpId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { icpId } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveICP>[0];
    const icp = await saveICP({ ...body, id: icpId });
    return NextResponse.json({ ok: true, icp });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { icpId } = await context.params;
  const removed = await deleteICP(icpId);
  if (!removed) return NextResponse.json({ error: "ICP not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
