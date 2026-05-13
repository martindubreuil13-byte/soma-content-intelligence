import { NextResponse } from "next/server";
import { isValidGroupPostStatus, readGroupPostLogs, upsertGroupPostLog } from "@/lib/group-targets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queueItemId = searchParams.get("queueItemId");
  const logs = await readGroupPostLogs();
  const filtered = queueItemId ? logs.filter((log) => log.queueItemId === queueItemId) : logs;
  return NextResponse.json({ ok: true, logs: filtered });
}

type LogBody = {
  queueItemId?: unknown;
  groupTargetId?: unknown;
  groupName?: unknown;
  caption?: unknown;
  status?: unknown;
  notes?: unknown;
  results?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as LogBody;
    const queueItemId = typeof body.queueItemId === "string" ? body.queueItemId : "";
    const groupTargetId = typeof body.groupTargetId === "string" ? body.groupTargetId : "";
    const groupName = typeof body.groupName === "string" ? body.groupName.slice(0, 200) : "";
    const caption = typeof body.caption === "string" ? body.caption.slice(0, 5000) : "";
    const status = isValidGroupPostStatus(body.status) ? body.status : "pending";
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 1000) : undefined;
    const results = typeof body.results === "string" ? body.results.slice(0, 1000) : undefined;
    const postedAt = status === "posted" ? new Date().toISOString() : undefined;

    if (!queueItemId || !groupTargetId) {
      return NextResponse.json({ error: "queueItemId and groupTargetId are required." }, { status: 400 });
    }

    const log = await upsertGroupPostLog({ queueItemId, groupTargetId, groupName, caption, status, notes, results, postedAt });
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
