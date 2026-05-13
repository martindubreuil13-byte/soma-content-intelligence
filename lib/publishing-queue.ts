import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ContentChannel } from "@/lib/content-types";
import type { PublishingQueueItem, QueueItemStatus } from "@/lib/autopilot-types";
import { readScheduleConfig } from "@/lib/schedule-config";

function memoryPath(fileName: string) {
  return path.join(process.cwd(), "memory", fileName);
}

function isQueueItem(value: unknown): value is PublishingQueueItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.runId === "string" && typeof v.channel === "string";
}

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

    // Get current time components in the target timezone
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);

    const p = (type: string) => Number(parts.find((x) => x.type === type)?.value ?? "0");
    const tzYear = p("year");
    const tzMonth = p("month"); // 1-indexed
    const tzDay = p("day");
    const curH = p("hour");
    const curM = p("minute");

    // Has today's slot already passed in the target timezone?
    const slotPast = curH > targetH || (curH === targetH && curM >= targetM);
    const targetDay = slotPast ? tzDay + 1 : tzDay;

    // Get the UTC offset for the timezone at this moment (e.g. "GMT+2", "GMT-5", "GMT+5:30")
    const offsetStr =
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "shortOffset"
      })
        .formatToParts(now)
        .find((x) => x.type === "timeZoneName")?.value ?? "GMT+0";

    const offsetMatch = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
    let offsetMin = 0;
    if (offsetMatch) {
      const sign = offsetMatch[1] === "+" ? 1 : -1;
      offsetMin = sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] ?? "0"));
    }

    // Build UTC timestamp: treat local target time as if UTC, then subtract offset
    const localAsUtcMs = Date.UTC(tzYear, tzMonth - 1, targetDay, targetH, targetM, 0);
    const utcMs = localAsUtcMs - offsetMin * 60000;
    const result = new Date(utcMs);

    // Safety: if result is somehow still in the past (e.g. DST edge), push forward 24h
    if (result <= now) {
      return new Date(utcMs + 24 * 60 * 60 * 1000).toISOString();
    }

    return result.toISOString();
  } catch {
    return null;
  }
}

export async function readPublishingQueue(): Promise<PublishingQueueItem[]> {
  try {
    const raw = await readFile(memoryPath("publishing-queue.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueueItem);
  } catch {
    return [];
  }
}

async function writePublishingQueue(items: PublishingQueueItem[]) {
  await mkdir(memoryPath("."), { recursive: true });
  await writeFile(memoryPath("publishing-queue.json"), `${JSON.stringify(items, null, 2)}\n`);
}

export async function addToQueue(item: Omit<PublishingQueueItem, "id" | "approvedAt" | "status">): Promise<PublishingQueueItem> {
  const [current, config] = await Promise.all([readPublishingQueue(), readScheduleConfig()]);

  // Compute scheduledFor from schedule config if not already provided and schedule is enabled
  let scheduledFor: string | undefined = item.scheduledFor;
  if (!scheduledFor && config.isEnabled && config.runTime) {
    scheduledFor = computeNextPublishingSlot(config.runTime, config.timezone) ?? undefined;
  }

  const newItem: PublishingQueueItem = {
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    approvedAt: new Date().toISOString(),
    status: "approved",
    ...(scheduledFor ? { scheduledFor } : {})
  };
  const withoutDuplicate = current.filter(
    (existing) => !(existing.runId === item.runId && existing.channel === item.channel)
  );
  await writePublishingQueue([...withoutDuplicate, newItem]);
  return newItem;
}

export async function updateQueueItem(
  itemId: string,
  updates: Partial<Pick<PublishingQueueItem, "status" | "scheduledFor" | "publishedAt" | "notes">>
): Promise<PublishingQueueItem | null> {
  const current = await readPublishingQueue();
  const index = current.findIndex((item) => item.id === itemId);
  if (index === -1) return null;
  const updated = { ...current[index], ...updates };
  current[index] = updated;
  await writePublishingQueue(current);
  return updated;
}

export async function removeFromQueue(itemId: string): Promise<boolean> {
  const current = await readPublishingQueue();
  const next = current.filter((item) => item.id !== itemId);
  if (next.length === current.length) return false;
  await writePublishingQueue(next);
  return true;
}

export async function getQueueItemForRun(runId: string, channel: ContentChannel): Promise<PublishingQueueItem | undefined> {
  const items = await readPublishingQueue();
  return items.find((item) => item.runId === runId && item.channel === channel);
}

export function isValidQueueStatus(value: unknown): value is QueueItemStatus {
  return value === "approved" || value === "scheduled" || value === "posted_manual" || value === "posted_auto" || value === "failed";
}
