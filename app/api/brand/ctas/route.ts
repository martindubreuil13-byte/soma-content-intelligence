import { NextResponse } from "next/server";
import { readCTAStyles, saveCTAStyle, seedDefaultsIfEmpty } from "@/lib/brand-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDefaultsIfEmpty();
  const ctas = await readCTAStyles();
  return NextResponse.json({ ok: true, ctas });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveCTAStyle>[0];
    const cta = await saveCTAStyle(body);
    return NextResponse.json({ ok: true, cta });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
