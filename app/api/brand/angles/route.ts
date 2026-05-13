import { NextResponse } from "next/server";
import { readAngles, saveAngle, seedDefaultsIfEmpty } from "@/lib/brand-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDefaultsIfEmpty();
  const angles = await readAngles();
  return NextResponse.json({ ok: true, angles });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveAngle>[0];
    const angle = await saveAngle(body);
    return NextResponse.json({ ok: true, angle });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
