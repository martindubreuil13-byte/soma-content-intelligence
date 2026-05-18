import type { GroupPostLog, GroupPostStatus, GroupTarget } from "@/lib/autopilot-types";
import {
  createGroupTargetDb,
  deleteGroupTargetDb,
  listGroupPostLogsDb,
  listGroupTargetsDb,
  updateGroupTargetDb,
  upsertGroupPostLogDb,
} from "@/lib/db/group-targets-db";

export async function readGroupTargets(): Promise<GroupTarget[]> {
  return listGroupTargetsDb();
}

export async function addGroupTarget(
  data: Omit<GroupTarget, "id" | "addedAt" | "isActive">
): Promise<GroupTarget> {
  return createGroupTargetDb(data);
}

export async function updateGroupTarget(
  groupId: string,
  updates: Partial<Pick<GroupTarget, "name" | "url" | "isActive" | "notes">>
): Promise<GroupTarget | null> {
  return updateGroupTargetDb(groupId, updates);
}

export async function deleteGroupTarget(groupId: string): Promise<boolean> {
  return deleteGroupTargetDb(groupId);
}

export async function readGroupPostLogs(): Promise<GroupPostLog[]> {
  return listGroupPostLogsDb();
}

export async function upsertGroupPostLog(
  data: Omit<GroupPostLog, "id"> & { id?: string }
): Promise<GroupPostLog> {
  return upsertGroupPostLogDb(data);
}

export function isValidGroupPostStatus(value: unknown): value is GroupPostStatus {
  return value === "pending" || value === "posted" || value === "skipped";
}
