import { NextResponse } from "next/server";
import { readICPs, saveICP, seedDefaultsIfEmpty } from "@/lib/brand-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDefaultsIfEmpty();
  const icps = await readICPs();
  return NextResponse.json({ ok: true, icps });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveICP>[0];
    const icp = await saveICP(body);
    return NextResponse.json({ ok: true, icp });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
