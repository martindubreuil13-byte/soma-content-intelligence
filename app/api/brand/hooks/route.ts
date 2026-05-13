import { NextResponse } from "next/server";
import { readHookStyles, saveHookStyle, seedDefaultsIfEmpty } from "@/lib/brand-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDefaultsIfEmpty();
  const hooks = await readHookStyles();
  return NextResponse.json({ ok: true, hooks });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveHookStyle>[0];
    const hook = await saveHookStyle(body);
    return NextResponse.json({ ok: true, hook });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
