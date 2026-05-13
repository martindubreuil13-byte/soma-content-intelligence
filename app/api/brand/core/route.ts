import { NextResponse } from "next/server";
import { readBrandCore, writeBrandCore } from "@/lib/brand-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  const core = await readBrandCore();
  return NextResponse.json({ ok: true, core });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const core = await writeBrandCore(body as Parameters<typeof writeBrandCore>[0]);
    return NextResponse.json({ ok: true, core });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
