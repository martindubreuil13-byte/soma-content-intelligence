import { NextResponse } from "next/server";
import { addToQueue, readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await readPublishingQueue();
  return NextResponse.json({ ok: true, items });
}

type AddQueueBody = {
  runId?: unknown;
  channel?: unknown;
  captionVersionId?: unknown;
  imageVersionId?: unknown;
  captionExcerpt?: unknown;
  imagePath?: unknown;
};

const validChannels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AddQueueBody;
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const channel = validChannels.includes(body.channel as ContentChannel) ? (body.channel as ContentChannel) : null;
    const captionVersionId = typeof body.captionVersionId === "string" ? body.captionVersionId : "";
    const captionExcerpt = typeof body.captionExcerpt === "string" ? body.captionExcerpt.slice(0, 200) : "";
    const imageVersionId = typeof body.imageVersionId === "string" ? body.imageVersionId : undefined;
    const imagePath = typeof body.imagePath === "string" ? body.imagePath : undefined;

    if (!runId || !channel) {
      return NextResponse.json({ error: "runId and channel are required." }, { status: 400 });
    }

    const item = await addToQueue({ runId, channel, captionVersionId, captionExcerpt, imageVersionId, imagePath });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
