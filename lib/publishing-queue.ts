import type { ContentChannel } from "@/lib/content-types";
import type { PublishingQueueItem, QueueItemStatus } from "@/lib/autopilot-types";
import {
  createPublishingQueueItemDb,
  deletePublishingQueueItemDb,
  getPublishingQueueItemForRunDb,
  listPublishingQueueDb,
  updatePublishingQueueItemDb,
} from "@/lib/db/publishing-queue-db";
import { readScheduleConfig } from "@/lib/schedule-config";

// Compute the next publishing slot given a runTime ("HH:MM") and timezone string.
// Returns an ISO UTC string, or null if the config is invalid.
function computeNextPublishingSlot(runTime: string, timezone: string): string | null {
  try {
    const match = runTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const targetH = Number(match[1]);
    const targetM = Number(match[2]);
    if (targetH > 23 || targetM > 59) return null;

    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const p = (type: string) => Number(parts.find((x) => x.type === type)?.value ?? "0");
    const tzYear = p("year");
    const tzMonth = p("month");
    const tzDay = p("day");
    const curH = p("hour");
    const curM = p("minute");
    const slotPast = curH > targetH || (curH === targetH && curM >= targetM);
    const targetDay = slotPast ? tzDay + 1 : tzDay;
    const offsetStr =
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "shortOffset",
      })
        .formatToParts(now)
        .find((x) => x.type === "timeZoneName")?.value ?? "GMT+0";

    const offsetMatch = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
    let offsetMin = 0;
    if (offsetMatch) {
      const sign = offsetMatch[1] === "+" ? 1 : -1;
      offsetMin = sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] ?? "0"));
    }

    const localAsUtcMs = Date.UTC(tzYear, tzMonth - 1, targetDay, targetH, targetM, 0);
    const utcMs = localAsUtcMs - offsetMin * 60000;
    const result = new Date(utcMs);

    if (result <= now) {
      return new Date(utcMs + 24 * 60 * 60 * 1000).toISOString();
    }

    return result.toISOString();
  } catch {
    return null;
  }
}

export async function readPublishingQueue(): Promise<PublishingQueueItem[]> {
  return listPublishingQueueDb();
}

export async function addToQueue(
  item: Omit<PublishingQueueItem, "id" | "approvedAt" | "status">
): Promise<PublishingQueueItem> {
  const config = await readScheduleConfig();
  let scheduledFor: string | undefined = item.scheduledFor;

  if (!scheduledFor && config.isEnabled && config.runTime) {
    scheduledFor = computeNextPublishingSlot(config.runTime, config.timezone) ?? undefined;
  }

  return createPublishingQueueItemDb({
    ...item,
    approvedAt: new Date().toISOString(),
    status: "approved",
    ...(scheduledFor ? { scheduledFor } : {}),
  });
}

export async function updateQueueItem(
  itemId: string,
  updates: Partial<Pick<PublishingQueueItem, "status" | "scheduledFor" | "publishedAt" | "notes">>
): Promise<PublishingQueueItem | null> {
  return updatePublishingQueueItemDb(itemId, updates);
}

export async function removeFromQueue(itemId: string): Promise<boolean> {
  return deletePublishingQueueItemDb(itemId);
}

export async function getQueueItemForRun(
  runId: string,
  channel: ContentChannel
): Promise<PublishingQueueItem | undefined> {
  return getPublishingQueueItemForRunDb(runId, channel);
}

export function isValidQueueStatus(value: unknown): value is QueueItemStatus {
  return value === "approved" || value === "scheduled" || value === "posted_manual" || value === "posted_auto" || value === "failed";
}
