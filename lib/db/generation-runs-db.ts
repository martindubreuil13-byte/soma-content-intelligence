import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type JsonObject = Record<string, unknown>;

export type GenerationRun = {
  id: string;
  organizationId: string;
  createdBy: string | null;
  legacyRunId: string | null;
  title: string | null;
  rawIdea: string | null;
  status: string;
  source: string | null;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

export type GenerationChannel = {
  id: string;
  organizationId: string;
  runId: string;
  channel: string;
  status: string;
  caption: string | null;
  visualPrompt: string | null;
  imageUrl: string | null;
  imageStoragePath: string | null;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

export type GenerationArtifact = {
  id: string;
  organizationId: string;
  runId: string;
  channelId: string | null;
  artifactType: string;
  version: number;
  content: string | null;
  storagePath: string | null;
  publicUrl: string | null;
  metadata: JsonObject;
  createdBy: string | null;
  createdAt: string;
};

export type FeedbackEvent = {
  id: string;
  organizationId: string;
  runId: string | null;
  channelId: string | null;
  artifactId: string | null;
  targetType: string;
  feedbackType: string;
  status: string | null;
  notes: string | null;
  tags: string[];
  metadata: JsonObject;
  createdBy: string | null;
  createdAt: string;
};

type GenerationRunRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  legacy_run_id: string | null;
  title: string | null;
  raw_idea: string | null;
  status: string;
  source: string | null;
  metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
};

type GenerationChannelRow = {
  id: string;
  organization_id: string;
  run_id: string;
  channel: string;
  status: string;
  caption: string | null;
  visual_prompt: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
};

type GenerationArtifactRow = {
  id: string;
  organization_id: string;
  run_id: string;
  channel_id: string | null;
  artifact_type: string;
  version: number;
  content: string | null;
  storage_path: string | null;
  public_url: string | null;
  metadata: JsonObject | null;
  created_by: string | null;
  created_at: string;
};

type FeedbackEventRow = {
  id: string;
  organization_id: string;
  run_id: string | null;
  channel_id: string | null;
  artifact_id: string | null;
  target_type: string;
  feedback_type: string;
  status: string | null;
  notes: string | null;
  tags: string[] | null;
  metadata: JsonObject | null;
  created_by: string | null;
  created_at: string;
};

export type CreateGenerationRunInput = {
  legacyRunId?: string | null;
  title?: string | null;
  rawIdea?: string | null;
  status?: string;
  source?: string | null;
  metadata?: JsonObject;
};

export type UpsertGenerationChannelInput = {
  runId?: string;
  legacyRunId?: string;
  channel: string;
  status?: string;
  caption?: string | null;
  visualPrompt?: string | null;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
  metadata?: JsonObject;
};

export type CreateGenerationArtifactInput = {
  runId?: string;
  legacyRunId?: string;
  channelId?: string | null;
  channel?: string;
  artifactType: string;
  version?: number;
  content?: string | null;
  storagePath?: string | null;
  publicUrl?: string | null;
  metadata?: JsonObject;
};

export type CreateFeedbackEventInput = {
  runId?: string | null;
  legacyRunId?: string;
  channelId?: string | null;
  channel?: string;
  artifactId?: string | null;
  targetType: string;
  feedbackType: string;
  status?: string | null;
  notes?: string | null;
  tags?: string[];
  metadata?: JsonObject;
};

const runSelect =
  "id, organization_id, created_by, legacy_run_id, title, raw_idea, status, source, metadata, created_at, updated_at";
const channelSelect =
  "id, organization_id, run_id, channel, status, caption, visual_prompt, image_url, image_storage_path, metadata, created_at, updated_at";
const artifactSelect =
  "id, organization_id, run_id, channel_id, artifact_type, version, content, storage_path, public_url, metadata, created_by, created_at";
const feedbackSelect =
  "id, organization_id, run_id, channel_id, artifact_id, target_type, feedback_type, status, notes, tags, metadata, created_by, created_at";

function toRun(row: GenerationRunRow): GenerationRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    legacyRunId: row.legacy_run_id,
    title: row.title,
    rawIdea: row.raw_idea,
    status: row.status,
    source: row.source,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toChannel(row: GenerationChannelRow): GenerationChannel {
  return {
    id: row.id,
    organizationId: row.organization_id,
    runId: row.run_id,
    channel: row.channel,
    status: row.status,
    caption: row.caption,
    visualPrompt: row.visual_prompt,
    imageUrl: row.image_url,
    imageStoragePath: row.image_storage_path,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toArtifact(row: GenerationArtifactRow): GenerationArtifact {
  return {
    id: row.id,
    organizationId: row.organization_id,
    runId: row.run_id,
    channelId: row.channel_id,
    artifactType: row.artifact_type,
    version: row.version,
    content: row.content,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    metadata: row.metadata ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toFeedbackEvent(row: FeedbackEventRow): FeedbackEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    runId: row.run_id,
    channelId: row.channel_id,
    artifactId: row.artifact_id,
    targetType: row.target_type,
    feedbackType: row.feedback_type,
    status: row.status,
    notes: row.notes,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function getRunIdFromInput(input: { runId?: string | null; legacyRunId?: string | null }) {
  if (input.runId) return input.runId;
  if (!input.legacyRunId) {
    throw new Error("Generation run id or legacy run id is required.");
  }

  const run = await getGenerationRunByLegacyRunId(input.legacyRunId);
  if (!run) {
    throw new Error(`Generation run not found for legacy_run_id ${input.legacyRunId}.`);
  }
  return run.id;
}

async function getChannelIdByRunAndChannel(runId: string, channel: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_channels")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("run_id", runId)
    .eq("channel", channel)
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("GENERATION CHANNEL ID LOOKUP ERROR", error);
    throw error;
  }

  return data?.id ?? null;
}

export async function createGenerationRun(input: CreateGenerationRunInput): Promise<GenerationRun> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const payload = {
    organization_id: context.organization.id,
    created_by: context.user.id,
    legacy_run_id: input.legacyRunId ?? null,
    title: input.title ?? null,
    raw_idea: input.rawIdea ?? null,
    status: input.status ?? "draft",
    source: input.source ?? null,
    metadata: input.metadata ?? {},
  };
  const query = input.legacyRunId
    ? supabase.from("generation_runs").upsert(payload, { onConflict: "legacy_run_id" })
    : supabase.from("generation_runs").insert(payload);
  const { data, error } = await query.select(runSelect).single<GenerationRunRow>();

  if (error) {
    console.error("GENERATION RUN CREATE ERROR", error);
    throw error;
  }

  return toRun(data);
}

export async function getGenerationRunById(id: string): Promise<GenerationRun | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_runs")
    .select(runSelect)
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .maybeSingle<GenerationRunRow>();

  if (error) {
    console.error("GENERATION RUN GET ERROR", error);
    throw error;
  }

  return data ? toRun(data) : null;
}

export async function getGenerationRunByLegacyRunId(legacyRunId: string): Promise<GenerationRun | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_runs")
    .select(runSelect)
    .eq("organization_id", context.organization.id)
    .eq("legacy_run_id", legacyRunId)
    .maybeSingle<GenerationRunRow>();

  if (error) {
    console.error("GENERATION RUN GET BY LEGACY ID ERROR", error);
    throw error;
  }

  return data ? toRun(data) : null;
}

export async function listGenerationRuns(): Promise<GenerationRun[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_runs")
    .select(runSelect)
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .returns<GenerationRunRow[]>();

  if (error) {
    console.error("GENERATION RUN LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toRun);
}

export async function updateGenerationRunStatus(id: string, status: string): Promise<GenerationRun> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_runs")
    .update({ status })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(runSelect)
    .single<GenerationRunRow>();

  if (error) {
    console.error("GENERATION RUN STATUS UPDATE ERROR", error);
    throw error;
  }

  return toRun(data);
}

export async function upsertGenerationChannel(
  input: UpsertGenerationChannelInput
): Promise<GenerationChannel> {
  const context = await requireWorkspaceContext();
  const runId = await getRunIdFromInput(input);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_channels")
    .upsert(
      {
        organization_id: context.organization.id,
        run_id: runId,
        channel: input.channel,
        status: input.status ?? "draft",
        ...(input.caption !== undefined ? { caption: input.caption } : {}),
        ...(input.visualPrompt !== undefined ? { visual_prompt: input.visualPrompt } : {}),
        ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
        ...(input.imageStoragePath !== undefined ? { image_storage_path: input.imageStoragePath } : {}),
        metadata: input.metadata ?? {},
      },
      { onConflict: "run_id,channel" }
    )
    .select(channelSelect)
    .single<GenerationChannelRow>();

  if (error) {
    console.error("GENERATION CHANNEL UPSERT ERROR", error);
    throw error;
  }

  return toChannel(data);
}

export async function createGenerationArtifact(
  input: CreateGenerationArtifactInput
): Promise<GenerationArtifact> {
  const context = await requireWorkspaceContext();
  const runId = await getRunIdFromInput(input);
  const channelId =
    input.channelId ?? (input.channel ? await getChannelIdByRunAndChannel(runId, input.channel) : null);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_artifacts")
    .insert({
      organization_id: context.organization.id,
      run_id: runId,
      channel_id: channelId,
      artifact_type: input.artifactType,
      version: input.version ?? 1,
      content: input.content ?? null,
      storage_path: input.storagePath ?? null,
      public_url: input.publicUrl ?? null,
      metadata: input.metadata ?? {},
      created_by: context.user.id,
    })
    .select(artifactSelect)
    .single<GenerationArtifactRow>();

  if (error) {
    console.error("GENERATION ARTIFACT CREATE ERROR", error);
    throw error;
  }

  return toArtifact(data);
}

export async function createFeedbackEvent(input: CreateFeedbackEventInput): Promise<FeedbackEvent> {
  const context = await requireWorkspaceContext();
  const runId = input.runId ?? (input.legacyRunId ? await getRunIdFromInput(input) : null);
  const channelId =
    input.channelId ?? (runId && input.channel ? await getChannelIdByRunAndChannel(runId, input.channel) : null);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("feedback_events")
    .insert({
      organization_id: context.organization.id,
      run_id: runId,
      channel_id: channelId,
      artifact_id: input.artifactId ?? null,
      target_type: input.targetType,
      feedback_type: input.feedbackType,
      status: input.status ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      created_by: context.user.id,
    })
    .select(feedbackSelect)
    .single<FeedbackEventRow>();

  if (error) {
    console.error("FEEDBACK EVENT CREATE ERROR", error);
    throw error;
  }

  return toFeedbackEvent(data);
}

export async function listGenerationChannels(runId: string): Promise<GenerationChannel[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_channels")
    .select(channelSelect)
    .eq("organization_id", context.organization.id)
    .eq("run_id", runId)
    .order("created_at", { ascending: true })
    .returns<GenerationChannelRow[]>();

  if (error) {
    console.error("GENERATION CHANNEL LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toChannel);
}

export async function listGenerationArtifacts(runId: string): Promise<GenerationArtifact[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_artifacts")
    .select(artifactSelect)
    .eq("organization_id", context.organization.id)
    .eq("run_id", runId)
    .order("created_at", { ascending: true })
    .returns<GenerationArtifactRow[]>();

  if (error) {
    console.error("GENERATION ARTIFACT LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toArtifact);
}
