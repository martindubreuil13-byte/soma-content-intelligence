import { NextResponse } from "next/server";
import { readNegativeConstraints, saveNegativeConstraint, seedDefaultsIfEmpty } from "@/lib/brand-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDefaultsIfEmpty();
  const constraints = await readNegativeConstraints();
  return NextResponse.json({ ok: true, constraints });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveNegativeConstraint>[0];
    if (!body.label?.trim()) {
      return NextResponse.json({ error: "label is required." }, { status: 400 });
    }
    const constraint = await saveNegativeConstraint(body);
    return NextResponse.json({ ok: true, constraint });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
