import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type JsonObject = Record<string, unknown>;

export type SchedulerRuntimeState = {
  id: string;
  organizationId: string;
  schedulerKey: string;
  isRunning: boolean;
  lockedUntil: string | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

type SchedulerRuntimeStateRow = {
  id: string;
  organization_id: string;
  scheduler_key: string;
  is_running: boolean;
  locked_until: string | null;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_error: string | null;
  metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
};

const schedulerSelect =
  "id, organization_id, scheduler_key, is_running, locked_until, last_started_at, last_completed_at, last_error, metadata, created_at, updated_at";

function toState(row: SchedulerRuntimeStateRow): SchedulerRuntimeState {
  return {
    id: row.id,
    organizationId: row.organization_id,
    schedulerKey: row.scheduler_key,
    isRunning: row.is_running,
    lockedUntil: row.locked_until,
    lastStartedAt: row.last_started_at,
    lastCompletedAt: row.last_completed_at,
    lastError: row.last_error,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function acquireSchedulerLock(
  schedulerKey = "default",
  timeoutSeconds = 300
): Promise<{ acquired: boolean; state: SchedulerRuntimeState | null }> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const lockedUntil = addSeconds(timeoutSeconds);

  await supabase.from("scheduler_runtime_state").upsert(
    {
      organization_id: context.organization.id,
      scheduler_key: schedulerKey,
      is_running: false,
      metadata: {},
    },
    { onConflict: "organization_id,scheduler_key", ignoreDuplicates: true }
  );

  const { data, error } = await supabase
    .from("scheduler_runtime_state")
    .update({
      is_running: true,
      locked_until: lockedUntil,
      last_started_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("scheduler_key", schedulerKey)
    .or(`is_running.eq.false,locked_until.is.null,locked_until.lt.${now}`)
    .select(schedulerSelect)
    .maybeSingle<SchedulerRuntimeStateRow>();

  if (error) {
    console.error("SCHEDULER LOCK ACQUIRE ERROR", error);
    throw error;
  }

  return { acquired: Boolean(data), state: data ? toState(data) : null };
}

export async function releaseSchedulerLock(
  schedulerKey = "default",
  metadata: JsonObject = {}
): Promise<SchedulerRuntimeState | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("scheduler_runtime_state")
    .update({
      is_running: false,
      locked_until: null,
      last_completed_at: now,
      metadata,
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("scheduler_key", schedulerKey)
    .select(schedulerSelect)
    .maybeSingle<SchedulerRuntimeStateRow>();

  if (error) {
    console.error("SCHEDULER LOCK RELEASE ERROR", error);
    throw error;
  }

  return data ? toState(data) : null;
}

export async function updateSchedulerHeartbeat(
  schedulerKey = "default",
  timeoutSeconds = 300
): Promise<SchedulerRuntimeState | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("scheduler_runtime_state")
    .update({
      locked_until: addSeconds(timeoutSeconds),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("scheduler_key", schedulerKey)
    .eq("is_running", true)
    .select(schedulerSelect)
    .maybeSingle<SchedulerRuntimeStateRow>();

  if (error) {
    console.error("SCHEDULER HEARTBEAT ERROR", error);
    throw error;
  }

  return data ? toState(data) : null;
}

export async function markSchedulerFailure(
  schedulerKey = "default",
  errorMessage: string,
  metadata: JsonObject = {}
): Promise<SchedulerRuntimeState | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("scheduler_runtime_state")
    .update({
      is_running: false,
      locked_until: null,
      last_completed_at: now,
      last_error: errorMessage,
      metadata,
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("scheduler_key", schedulerKey)
    .select(schedulerSelect)
    .maybeSingle<SchedulerRuntimeStateRow>();

  if (error) {
    console.error("SCHEDULER FAILURE MARK ERROR", error);
    throw error;
  }

  return data ? toState(data) : null;
}
