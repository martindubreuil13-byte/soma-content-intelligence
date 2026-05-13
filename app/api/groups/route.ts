import { NextResponse } from "next/server";
import { addGroupTarget, readGroupTargets } from "@/lib/group-targets";

export const dynamic = "force-dynamic";

export async function GET() {
  const targets = await readGroupTargets();
  return NextResponse.json({ ok: true, targets });
}

type AddGroupBody = { name?: unknown; platform?: unknown; url?: unknown; notes?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AddGroupBody;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    const platform = body.platform === "facebook" || body.platform === "linkedin" ? body.platform : null;
    const url = typeof body.url === "string" ? body.url.trim().slice(0, 500) : undefined;
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : undefined;

    if (!name || !platform) {
      return NextResponse.json({ error: "name and platform are required." }, { status: 400 });
    }

    const target = await addGroupTarget({ name, platform, url, notes });
    return NextResponse.json({ ok: true, target });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
