import { NextResponse } from "next/server";
import { readScheduleConfig, updateScheduleConfig } from "@/lib/schedule-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readScheduleConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (typeof body.isEnabled === "boolean") updates.isEnabled = body.isEnabled;
    if (typeof body.runTime === "string" && /^\d{2}:\d{2}$/.test(body.runTime)) updates.runTime = body.runTime;
    if (typeof body.timezone === "string") updates.timezone = body.timezone.slice(0, 100);
    if (Array.isArray(body.channels)) updates.channels = body.channels;
    if (body.ideaSource === "manual" || body.ideaSource === "auto") updates.ideaSource = body.ideaSource;

    const config = await updateScheduleConfig(updates);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
