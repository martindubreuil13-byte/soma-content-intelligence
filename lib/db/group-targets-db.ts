import type { GroupPostLog, GroupTarget } from "@/lib/autopilot-types";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type GroupTargetRow = {
  id: string;
  platform: GroupTarget["platform"];
  name: string;
  url: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type GroupPostLogMetadata = {
  groupName?: string;
  caption?: string;
  results?: string;
};

type GroupPostLogRow = {
  id: string;
  queue_item_id: string | null;
  group_target_id: string | null;
  status: GroupPostLog["status"];
  notes: string | null;
  posted_at: string | null;
  metadata: GroupPostLogMetadata | null;
};

function toGroupTarget(row: GroupTargetRow): GroupTarget {
  return {
    id: row.id,
    platform: row.platform,
    name: row.name,
    url: row.url ?? undefined,
    isActive: row.active,
    addedAt: row.created_at,
    notes: row.notes ?? undefined,
  };
}

function toGroupPostLog(row: GroupPostLogRow): GroupPostLog {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    queueItemId: row.queue_item_id ?? "",
    groupTargetId: row.group_target_id ?? "",
    groupName: metadata.groupName ?? "",
    caption: metadata.caption ?? "",
    status: row.status,
    postedAt: row.posted_at ?? undefined,
    notes: row.notes ?? undefined,
    results: metadata.results,
  };
}

export async function listGroupTargetsDb(): Promise<GroupTarget[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("group_targets")
    .select("id, platform, name, url, active, notes, created_at")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: true })
    .returns<GroupTargetRow[]>();

  if (error) {
    console.error("GROUP TARGETS LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toGroupTarget);
}

export async function createGroupTargetDb(
  data: Omit<GroupTarget, "id" | "addedAt" | "isActive">
): Promise<GroupTarget> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("group_targets")
    .insert({
      organization_id: context.organization.id,
      created_by: context.user.id,
      name: data.name,
      platform: data.platform,
      url: data.url,
      notes: data.notes,
      active: true,
    })
    .select("id, platform, name, url, active, notes, created_at")
    .single<GroupTargetRow>();

  if (error) {
    console.error("GROUP TARGET CREATE ERROR", error);
    throw error;
  }

  return toGroupTarget(row);
}

export async function updateGroupTargetDb(
  groupId: string,
  updates: Partial<Pick<GroupTarget, "name" | "url" | "isActive" | "notes">>
): Promise<GroupTarget | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("group_targets")
    .update({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.url !== undefined ? { url: updates.url } : {}),
      ...(updates.isActive !== undefined ? { active: updates.isActive } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", groupId)
    .select("id, platform, name, url, active, notes, created_at")
    .maybeSingle<GroupTargetRow>();

  if (error) {
    console.error("GROUP TARGET UPDATE ERROR", error);
    throw error;
  }

  return row ? toGroupTarget(row) : null;
}

export async function deleteGroupTargetDb(groupId: string): Promise<boolean> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("group_targets")
    .delete({ count: "exact" })
    .eq("organization_id", context.organization.id)
    .eq("id", groupId);

  if (error) {
    console.error("GROUP TARGET DELETE ERROR", error);
    throw error;
  }

  return Boolean(count);
}

export async function listGroupPostLogsDb(): Promise<GroupPostLog[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("group_post_logs")
    .select("id, queue_item_id, group_target_id, status, notes, posted_at, metadata")
    .eq("organization_id", context.organization.id)
    .order("posted_at", { ascending: false })
    .returns<GroupPostLogRow[]>();

  if (error) {
    console.error("GROUP POST LOGS LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toGroupPostLog);
}

export async function upsertGroupPostLogDb(
  data: Omit<GroupPostLog, "id"> & { id?: string }
): Promise<GroupPostLog> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const existing = (await listGroupPostLogsDb()).find(
    (log) => log.queueItemId === data.queueItemId && log.groupTargetId === data.groupTargetId
  );
  const payload = {
    organization_id: context.organization.id,
    created_by: context.user.id,
    queue_item_id: data.queueItemId,
    group_target_id: data.groupTargetId,
    status: data.status,
    notes: data.notes,
    posted_at: data.postedAt,
    metadata: {
      groupName: data.groupName,
      caption: data.caption,
      results: data.results,
    } satisfies GroupPostLogMetadata,
  };

  const query = existing
    ? supabase
        .from("group_post_logs")
        .update(payload)
        .eq("organization_id", context.organization.id)
        .eq("id", existing.id)
    : supabase.from("group_post_logs").insert(payload);

  const { data: row, error } = await query
    .select("id, queue_item_id, group_target_id, status, notes, posted_at, metadata")
    .single<GroupPostLogRow>();

  if (error) {
    console.error("GROUP POST LOG UPSERT ERROR", error);
    throw error;
  }

  return toGroupPostLog(row);
}
