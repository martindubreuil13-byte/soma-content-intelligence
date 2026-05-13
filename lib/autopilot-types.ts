import type { ContentChannel } from "@/lib/content-types";

export type QueueItemStatus = "approved" | "scheduled" | "posted_manual" | "posted_auto" | "failed";

export type PublishingQueueItem = {
  id: string;
  runId: string;
  channel: ContentChannel;
  captionVersionId: string;
  imageVersionId?: string;
  captionExcerpt: string;
  imagePath?: string;
  approvedAt: string;
  status: QueueItemStatus;
  scheduledFor?: string;
  publishedAt?: string;
  notes?: string;
};

export type GroupPlatform = "facebook" | "linkedin";

export type GroupTarget = {
  id: string;
  platform: GroupPlatform;
  name: string;
  url?: string;
  isActive: boolean;
  addedAt: string;
  notes?: string;
};

export type GroupPostStatus = "pending" | "posted" | "skipped";

export type GroupPostLog = {
  id: string;
  queueItemId: string;
  groupTargetId: string;
  groupName: string;
  caption: string;
  status: GroupPostStatus;
  postedAt?: string;
  notes?: string;
  results?: string;
};

export type ScheduleConfig = {
  isEnabled: boolean;
  runTime: string;
  timezone: string;
  channels: ContentChannel[];
  ideaSource: "manual" | "auto";
  lastRunAt?: string;
  nextRunAt?: string;
};

export const defaultScheduleConfig: ScheduleConfig = {
  isEnabled: false,
  runTime: "07:00",
  timezone: "Europe/Paris",
  channels: ["linkedin", "facebook", "instagram"],
  ideaSource: "manual"
};
