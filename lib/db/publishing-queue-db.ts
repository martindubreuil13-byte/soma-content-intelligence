import type { ContentChannel } from "@/lib/content-types";
import type { PublishingQueueItem } from "@/lib/autopilot-types";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type PublishingQueueMetadata = {
  captionVersionId?: string;
  imageVersionId?: string;
  approvedAt?: string;
  publishedAt?: string;
  notes?: string;
};

type PublishingQueueRow = {
  id: string;
  run_id: string;
  channel: string;
  status: PublishingQueueItem["status"];
  caption: string | null;
  image_url: string | null;
  scheduled_for: string | null;
  metadata: PublishingQueueMetadata | null;
  created_at: string;
};

function toQueueItem(row: PublishingQueueRow): PublishingQueueItem {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    runId: row.run_id,
    channel: row.channel as ContentChannel,
    captionVersionId: metadata.captionVersionId ?? "",
    imageVersionId: metadata.imageVersionId,
    captionExcerpt: row.caption ?? "",
    imagePath: row.image_url ?? undefined,
    approvedAt: metadata.approvedAt ?? row.created_at,
    status: row.status,
    scheduledFor: row.scheduled_for ?? undefined,
    publishedAt: metadata.publishedAt,
    notes: metadata.notes,
  };
}

export async function listPublishingQueueDb(): Promise<PublishingQueueItem[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("publishing_queue")
    .select("id, run_id, channel, status, caption, image_url, scheduled_for, metadata, created_at")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .returns<PublishingQueueRow[]>();

  if (error) {
    console.error("PUBLISHING QUEUE LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toQueueItem);
}

export async function createPublishingQueueItemDb(
  item: Omit<PublishingQueueItem, "id">
): Promise<PublishingQueueItem> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const metadata: PublishingQueueMetadata = {
    captionVersionId: item.captionVersionId,
    imageVersionId: item.imageVersionId,
    approvedAt: item.approvedAt,
    publishedAt: item.publishedAt,
    notes: item.notes,
  };

  const { data, error } = await supabase
    .from("publishing_queue")
    .upsert(
      {
        organization_id: context.organization.id,
        created_by: context.user.id,
        run_id: item.runId,
        channel: item.channel,
        status: item.status,
        caption: item.captionExcerpt,
        image_url: item.imagePath,
        scheduled_for: item.scheduledFor,
        metadata,
      },
      { onConflict: "organization_id,run_id,channel" }
    )
    .select("id, run_id, channel, status, caption, image_url, scheduled_for, metadata, created_at")
    .single<PublishingQueueRow>();

  if (error) {
    console.error("PUBLISHING QUEUE CREATE ERROR", error);
    throw error;
  }

  return toQueueItem(data);
}

export async function updatePublishingQueueItemDb(
  itemId: string,
  updates: Partial<Pick<PublishingQueueItem, "status" | "scheduledFor" | "publishedAt" | "notes">>
): Promise<PublishingQueueItem | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const current = await getPublishingQueueItemDb(itemId);

  if (!current) {
    return null;
  }

  const metadata: PublishingQueueMetadata = {
    captionVersionId: current.captionVersionId,
    imageVersionId: current.imageVersionId,
    approvedAt: current.approvedAt,
    publishedAt: updates.publishedAt ?? current.publishedAt,
    notes: updates.notes ?? current.notes,
  };

  const { data, error } = await supabase
    .from("publishing_queue")
    .update({
      status: updates.status ?? current.status,
      scheduled_for: updates.scheduledFor ?? current.scheduledFor ?? null,
      metadata,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", itemId)
    .select("id, run_id, channel, status, caption, image_url, scheduled_for, metadata, created_at")
    .maybeSingle<PublishingQueueRow>();

  if (error) {
    console.error("PUBLISHING QUEUE UPDATE ERROR", error);
    throw error;
  }

  return data ? toQueueItem(data) : null;
}

export async function deletePublishingQueueItemDb(itemId: string): Promise<boolean> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("publishing_queue")
    .delete({ count: "exact" })
    .eq("organization_id", context.organization.id)
    .eq("id", itemId);

  if (error) {
    console.error("PUBLISHING QUEUE DELETE ERROR", error);
    throw error;
  }

  return Boolean(count);
}

export async function getPublishingQueueItemForRunDb(
  runId: string,
  channel: ContentChannel
): Promise<PublishingQueueItem | undefined> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("publishing_queue")
    .select("id, run_id, channel, status, caption, image_url, scheduled_for, metadata, created_at")
    .eq("organization_id", context.organization.id)
    .eq("run_id", runId)
    .eq("channel", channel)
    .maybeSingle<PublishingQueueRow>();

  if (error) {
    console.error("PUBLISHING QUEUE GET FOR RUN ERROR", error);
    throw error;
  }

  return data ? toQueueItem(data) : undefined;
}

async function getPublishingQueueItemDb(itemId: string): Promise<PublishingQueueItem | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("publishing_queue")
    .select("id, run_id, channel, status, caption, image_url, scheduled_for, metadata, created_at")
    .eq("organization_id", context.organization.id)
    .eq("id", itemId)
    .maybeSingle<PublishingQueueRow>();

  if (error) {
    console.error("PUBLISHING QUEUE GET ERROR", error);
    throw error;
  }

  return data ? toQueueItem(data) : null;
}
