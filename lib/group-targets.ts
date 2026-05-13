import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { GroupPostLog, GroupPostStatus, GroupTarget } from "@/lib/autopilot-types";

function memoryPath(fileName: string) {
  return path.join(process.cwd(), "memory", fileName);
}

function isGroupTarget(value: unknown): value is GroupTarget {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.platform === "string";
}

function isGroupPostLog(value: unknown): value is GroupPostLog {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.queueItemId === "string" && typeof v.groupTargetId === "string";
}

export async function readGroupTargets(): Promise<GroupTarget[]> {
  try {
    const raw = await readFile(memoryPath("group-targets.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGroupTarget);
  } catch {
    return [];
  }
}

async function writeGroupTargets(targets: GroupTarget[]) {
  await mkdir(memoryPath("."), { recursive: true });
  await writeFile(memoryPath("group-targets.json"), `${JSON.stringify(targets, null, 2)}\n`);
}

export async function addGroupTarget(data: Omit<GroupTarget, "id" | "addedAt" | "isActive">): Promise<GroupTarget> {
  const current = await readGroupTargets();
  const newTarget: GroupTarget = {
    ...data,
    id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: new Date().toISOString(),
    isActive: true
  };
  await writeGroupTargets([...current, newTarget]);
  return newTarget;
}

export async function updateGroupTarget(
  groupId: string,
  updates: Partial<Pick<GroupTarget, "name" | "url" | "isActive" | "notes">>
): Promise<GroupTarget | null> {
  const current = await readGroupTargets();
  const index = current.findIndex((g) => g.id === groupId);
  if (index === -1) return null;
  const updated = { ...current[index], ...updates };
  current[index] = updated;
  await writeGroupTargets(current);
  return updated;
}

export async function deleteGroupTarget(groupId: string): Promise<boolean> {
  const current = await readGroupTargets();
  const next = current.filter((g) => g.id !== groupId);
  if (next.length === current.length) return false;
  await writeGroupTargets(next);
  return true;
}

export async function readGroupPostLogs(): Promise<GroupPostLog[]> {
  try {
    const raw = await readFile(memoryPath("group-post-logs.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGroupPostLog);
  } catch {
    return [];
  }
}

async function writeGroupPostLogs(logs: GroupPostLog[]) {
  await mkdir(memoryPath("."), { recursive: true });
  await writeFile(memoryPath("group-post-logs.json"), `${JSON.stringify(logs, null, 2)}\n`);
}

export async function upsertGroupPostLog(data: Omit<GroupPostLog, "id"> & { id?: string }): Promise<GroupPostLog> {
  const current = await readGroupPostLogs();
  const existingIndex = current.findIndex(
    (log) => log.queueItemId === data.queueItemId && log.groupTargetId === data.groupTargetId
  );
  const log: GroupPostLog = {
    ...data,
    id: data.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  };
  if (existingIndex !== -1) {
    current[existingIndex] = log;
  } else {
    current.push(log);
  }
  await writeGroupPostLogs(current);
  return log;
}

export function isValidGroupPostStatus(value: unknown): value is GroupPostStatus {
  return value === "pending" || value === "posted" || value === "skipped";
}
