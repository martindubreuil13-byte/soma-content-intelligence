import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type JsonObject = Record<string, unknown>;

export type ExecutionJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionJobType =
  | "generation"
  | "caption_regeneration"
  | "visual_regeneration"
  | "image_generation"
  | "training_rebuild"
  | "scheduler_tick";

export type ExecutionJob = {
  id: string;
  organizationId: string;
  generationRunId: string | null;
  jobType: ExecutionJobType | string;
  status: ExecutionJobStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  lockedAt: string | null;
  workerId: string | null;
  errorMessage: string | null;
  payload: JsonObject;
  result: JsonObject;
  metadata: JsonObject;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExecutionJobRow = {
  id: string;
  organization_id: string;
  generation_run_id: string | null;
  job_type: string;
  status: ExecutionJobStatus;
  priority: number | null;
  retry_count: number | null;
  max_retries: number | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  locked_at: string | null;
  worker_id: string | null;
  error_message: string | null;
  payload: JsonObject | null;
  result: JsonObject | null;
  metadata: JsonObject | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExecutionEvent = {
  id: string;
  organizationId: string;
  executionJobId: string;
  eventType: string;
  message: string | null;
  metadata: JsonObject;
  createdAt: string;
};

type ExecutionEventRow = {
  id: string;
  organization_id: string;
  execution_job_id: string;
  event_type: string;
  message: string | null;
  metadata: JsonObject | null;
  created_at: string;
};

export type CreateExecutionJobInput = {
  generationRunId?: string | null;
  jobType: ExecutionJobType | string;
  priority?: number;
  maxRetries?: number;
  scheduledFor?: string | null;
  payload?: JsonObject;
  metadata?: JsonObject;
};

const jobSelect =
  "id, organization_id, generation_run_id, job_type, status, priority, retry_count, max_retries, scheduled_for, started_at, completed_at, failed_at, locked_at, worker_id, error_message, payload, result, metadata, created_by, created_at, updated_at";
const eventSelect =
  "id, organization_id, execution_job_id, event_type, message, metadata, created_at";

function toJob(row: ExecutionJobRow): ExecutionJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    generationRunId: row.generation_run_id,
    jobType: row.job_type,
    status: row.status,
    priority: row.priority ?? 100,
    retryCount: row.retry_count ?? 0,
    maxRetries: row.max_retries ?? 3,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    lockedAt: row.locked_at,
    workerId: row.worker_id,
    errorMessage: row.error_message,
    payload: row.payload ?? {},
    result: row.result ?? {},
    metadata: row.metadata ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: ExecutionEventRow): ExecutionEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    executionJobId: row.execution_job_id,
    eventType: row.event_type,
    message: row.message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function createExecutionJob(input: CreateExecutionJobInput): Promise<ExecutionJob> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("execution_jobs")
    .insert({
      organization_id: context.organization.id,
      generation_run_id: input.generationRunId ?? null,
      job_type: input.jobType,
      status: "queued",
      priority: input.priority ?? 100,
      max_retries: input.maxRetries ?? 3,
      scheduled_for: input.scheduledFor ?? new Date().toISOString(),
      payload: input.payload ?? {},
      metadata: input.metadata ?? {},
      created_by: context.user.id,
    })
    .select(jobSelect)
    .single<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB CREATE ERROR", error);
    throw error;
  }

  const job = toJob(data);
  await appendExecutionEvent(job.id, "queued", `Queued ${job.jobType}`, { payload: job.payload });
  return job;
}

export async function getExecutionJob(id: string): Promise<ExecutionJob | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("execution_jobs")
    .select(jobSelect)
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .maybeSingle<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB GET ERROR", error);
    throw error;
  }

  return data ? toJob(data) : null;
}

export async function listExecutionJobs(filters: { status?: ExecutionJobStatus | null; limit?: number } = {}): Promise<ExecutionJob[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  let query = supabase
    .from("execution_jobs")
    .select(jobSelect)
    .eq("organization_id", context.organization.id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.returns<ExecutionJobRow[]>();

  if (error) {
    console.error("EXECUTION JOB LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toJob);
}

export async function listExecutionEvents(executionJobId: string, limit = 20): Promise<ExecutionEvent[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("execution_events")
    .select(eventSelect)
    .eq("organization_id", context.organization.id)
    .eq("execution_job_id", executionJobId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ExecutionEventRow[]>();

  if (error) {
    console.error("EXECUTION EVENT LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toEvent).reverse();
}

export async function acquireNextExecutionJob(workerId: string, staleAfterSeconds = 300): Promise<ExecutionJob | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const staleBefore = new Date(Date.now() - staleAfterSeconds * 1000).toISOString();
  const now = new Date().toISOString();
  const { data: candidates, error: candidateError } = await supabase
    .from("execution_jobs")
    .select(jobSelect)
    .eq("organization_id", context.organization.id)
    .lte("scheduled_for", now)
    .or(`status.eq.queued,and(status.eq.running,locked_at.lt.${staleBefore})`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<ExecutionJobRow[]>();

  if (candidateError) {
    console.error("EXECUTION JOB ACQUIRE CANDIDATE ERROR", candidateError);
    throw candidateError;
  }

  const candidate = candidates?.[0];
  if (!candidate) return null;

  const { data, error } = await supabase
    .from("execution_jobs")
    .update({
      status: "running",
      worker_id: workerId,
      locked_at: now,
      started_at: candidate.started_at ?? now,
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", candidate.id)
    .in("status", ["queued", "running"])
    .select(jobSelect)
    .maybeSingle<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB ACQUIRE UPDATE ERROR", error);
    throw error;
  }

  return data ? toJob(data) : null;
}

export async function markExecutionJobRunning(id: string, workerId: string): Promise<ExecutionJob> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("execution_jobs")
    .update({ status: "running", worker_id: workerId, locked_at: now, started_at: now, updated_at: now })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(jobSelect)
    .single<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB RUNNING ERROR", error);
    throw error;
  }

  await appendExecutionEvent(id, "running", "Job started", { worker_id: workerId });
  return toJob(data);
}

export async function markExecutionJobCompleted(id: string, result: JsonObject = {}): Promise<ExecutionJob> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("execution_jobs")
    .update({
      status: "completed",
      result,
      completed_at: now,
      locked_at: null,
      error_message: null,
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(jobSelect)
    .single<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB COMPLETED ERROR", error);
    throw error;
  }

  await appendExecutionEvent(id, "completed", "Job completed", result);
  return toJob(data);
}

export async function markExecutionJobFailed(id: string, errorMessage: string, metadata: JsonObject = {}): Promise<ExecutionJob> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const current = await getExecutionJob(id);
  const shouldRetry = current ? current.retryCount < current.maxRetries : false;
  const { data, error } = await supabase
    .from("execution_jobs")
    .update({
      status: shouldRetry ? "queued" : "failed",
      retry_count: current ? current.retryCount + 1 : 0,
      scheduled_for: shouldRetry ? new Date(Date.now() + 30_000).toISOString() : current?.scheduledFor ?? now,
      failed_at: shouldRetry ? null : now,
      locked_at: null,
      error_message: errorMessage,
      metadata: { ...(current?.metadata ?? {}), ...metadata },
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(jobSelect)
    .single<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB FAILED ERROR", error);
    throw error;
  }

  await appendExecutionEvent(id, shouldRetry ? "retry_scheduled" : "failed", errorMessage, metadata);
  return toJob(data);
}

export async function retryExecutionJob(id: string): Promise<ExecutionJob> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("execution_jobs")
    .update({
      status: "queued",
      scheduled_for: new Date().toISOString(),
      locked_at: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(jobSelect)
    .single<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB RETRY ERROR", error);
    throw error;
  }

  await appendExecutionEvent(id, "retry_queued", "Job manually queued for retry");
  return toJob(data);
}

export async function cancelExecutionJob(id: string): Promise<ExecutionJob> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("execution_jobs")
    .update({ status: "cancelled", locked_at: null, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(jobSelect)
    .single<ExecutionJobRow>();

  if (error) {
    console.error("EXECUTION JOB CANCEL ERROR", error);
    throw error;
  }

  await appendExecutionEvent(id, "cancelled", "Job cancelled");
  return toJob(data);
}

export async function appendExecutionEvent(
  executionJobId: string,
  eventType: string,
  message?: string | null,
  metadata: JsonObject = {}
): Promise<ExecutionEvent> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("execution_events")
    .insert({
      organization_id: context.organization.id,
      execution_job_id: executionJobId,
      event_type: eventType,
      message: message ?? null,
      metadata,
    })
    .select(eventSelect)
    .single<ExecutionEventRow>();

  if (error) {
    console.error("EXECUTION EVENT APPEND ERROR", error);
    throw error;
  }

  return toEvent(data);
}
