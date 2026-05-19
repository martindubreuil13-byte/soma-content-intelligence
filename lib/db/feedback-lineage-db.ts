import { createServerSupabase } from "@/lib/supabase/server";
import {
  createGenerationArtifact,
  getGenerationRunByLegacyRunId,
  type GenerationArtifact,
  type GenerationRun,
} from "@/lib/db/generation-runs-db";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";
import type { ContentChannel, FeedbackStatus, FeedbackTarget, FeedbackVersion } from "@/lib/content-types";

type JsonObject = Record<string, unknown>;

export type FeedbackLineage = {
  id: string;
  organizationId: string;
  generationRunId: string;
  channel: string;
  currentCaptionVersionId: string | null;
  currentVisualPromptVersionId: string | null;
  currentImageVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackLineageVersion = {
  id: string;
  organizationId: string;
  feedbackLineageId: string;
  artifactType: FeedbackTarget;
  generationArtifactId: string | null;
  versionNumber: number;
  status: FeedbackStatus;
  tags: string[];
  notes: string;
  metadata: JsonObject;
  createdAt: string;
};

type FeedbackLineageRow = {
  id: string;
  organization_id: string;
  generation_run_id: string;
  channel: string;
  current_caption_version_id: string | null;
  current_visual_prompt_version_id: string | null;
  current_image_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type FeedbackLineageVersionRow = {
  id: string;
  organization_id: string;
  feedback_lineage_id: string;
  artifact_type: FeedbackTarget;
  generation_artifact_id: string | null;
  version_number: number;
  status: FeedbackStatus;
  tags: string[] | null;
  notes: string | null;
  metadata: JsonObject | null;
  created_at: string;
};

export type AppendLineageVersionInput = {
  legacyRunId?: string;
  generationRunId?: string;
  channel: ContentChannel;
  artifactType: FeedbackTarget;
  generationArtifactId?: string | null;
  content?: string | null;
  status?: FeedbackStatus;
  notes?: string;
  tags?: string[];
  metadata?: JsonObject;
};

const lineageSelect =
  "id, organization_id, generation_run_id, channel, current_caption_version_id, current_visual_prompt_version_id, current_image_version_id, created_at, updated_at";
const versionSelect =
  "id, organization_id, feedback_lineage_id, artifact_type, generation_artifact_id, version_number, status, tags, notes, metadata, created_at";

function toLineage(row: FeedbackLineageRow): FeedbackLineage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    generationRunId: row.generation_run_id,
    channel: row.channel,
    currentCaptionVersionId: row.current_caption_version_id,
    currentVisualPromptVersionId: row.current_visual_prompt_version_id,
    currentImageVersionId: row.current_image_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLineageVersion(row: FeedbackLineageVersionRow): FeedbackLineageVersion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    feedbackLineageId: row.feedback_lineage_id,
    artifactType: row.artifact_type,
    generationArtifactId: row.generation_artifact_id,
    versionNumber: row.version_number,
    status: row.status,
    tags: row.tags ?? [],
    notes: row.notes ?? "",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function normalizeArtifactType(value: FeedbackTarget) {
  return value === "visualPrompt" ? "visual_prompt" : value;
}

export function lineageVersionToFeedbackVersion(version: FeedbackLineageVersion): FeedbackVersion {
  return {
    id: version.id,
    createdAt: version.createdAt,
    generationType:
      version.metadata.generation_type === "regenerate" || version.metadata.generation_type === "reimagine"
        ? version.metadata.generation_type
        : "initial",
    status: version.status,
    notes: version.notes,
    tags: version.tags,
    updatedAt: typeof version.metadata.updated_at === "string" ? version.metadata.updated_at : undefined,
    text: typeof version.metadata.text === "string" ? version.metadata.text : undefined,
    archetype: typeof version.metadata.archetype === "string" ? version.metadata.archetype : undefined,
    conceptAngle: typeof version.metadata.concept_angle === "string" ? version.metadata.concept_angle : undefined,
    promptExcerpt: typeof version.metadata.prompt_excerpt === "string" ? version.metadata.prompt_excerpt : undefined,
    imagePath: typeof version.metadata.image_path === "string" ? version.metadata.image_path : undefined,
    captionExcerpt: typeof version.metadata.caption_excerpt === "string" ? version.metadata.caption_excerpt : undefined,
    parentCaptionVersionId:
      typeof version.metadata.parent_caption_version_id === "string" ? version.metadata.parent_caption_version_id : undefined,
    regenerationIndex:
      typeof version.metadata.regeneration_index === "number" ? version.metadata.regeneration_index : undefined,
    sourceVisualPromptVersionId:
      typeof version.metadata.source_visual_prompt_version_id === "string"
        ? version.metadata.source_visual_prompt_version_id
        : undefined,
  };
}

async function resolveRun(input: { generationRunId?: string; legacyRunId?: string }): Promise<GenerationRun | null> {
  if (input.legacyRunId) return getGenerationRunByLegacyRunId(input.legacyRunId);
  if (!input.generationRunId) return null;

  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("generation_runs")
    .select("id, organization_id, created_by, legacy_run_id, title, raw_idea, status, source, metadata, queued_at, started_at, completed_at, created_at, updated_at")
    .eq("organization_id", context.organization.id)
    .eq("id", input.generationRunId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    createdBy: data.created_by,
    legacyRunId: data.legacy_run_id,
    title: data.title,
    rawIdea: data.raw_idea,
    status: data.status,
    source: data.source,
    metadata: data.metadata ?? {},
    queuedAt: data.queued_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function resolveRunId(input: { generationRunId?: string; legacyRunId?: string }) {
  if (input.generationRunId) return input.generationRunId;
  const run = await resolveRun(input);
  if (!run) throw new Error("Generation run is required for feedback lineage.");
  return run.id;
}

export async function getOrCreateFeedbackLineage(input: {
  generationRunId?: string;
  legacyRunId?: string;
  channel: ContentChannel;
}): Promise<FeedbackLineage> {
  const context = await requireWorkspaceContext();
  const generationRunId = await resolveRunId(input);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("feedback_lineages")
    .upsert(
      {
        organization_id: context.organization.id,
        generation_run_id: generationRunId,
        channel: input.channel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "generation_run_id,channel" }
    )
    .select(lineageSelect)
    .single<FeedbackLineageRow>();

  if (error) {
    console.error("FEEDBACK LINEAGE UPSERT ERROR", error);
    throw error;
  }

  return toLineage(data);
}

export async function appendLineageVersion(input: AppendLineageVersionInput): Promise<FeedbackLineageVersion> {
  const context = await requireWorkspaceContext();
  const lineage = await getOrCreateFeedbackLineage(input);
  const supabase = await createServerSupabase();
  const { count, error: countError } = await supabase
    .from("feedback_lineage_versions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", context.organization.id)
    .eq("feedback_lineage_id", lineage.id)
    .eq("artifact_type", input.artifactType);

  if (countError) {
    console.error("FEEDBACK LINEAGE VERSION COUNT ERROR", countError);
    throw countError;
  }

  const versionNumber = (count ?? 0) + 1;
  const { data, error } = await supabase
    .from("feedback_lineage_versions")
    .insert({
      organization_id: context.organization.id,
      feedback_lineage_id: lineage.id,
      artifact_type: input.artifactType,
      generation_artifact_id: input.generationArtifactId ?? null,
      version_number: versionNumber,
      status: input.status ?? "pending",
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.content ? { text: input.content } : {}),
        channel: input.channel,
      },
    })
    .select(versionSelect)
    .single<FeedbackLineageVersionRow>();

  if (error) {
    console.error("FEEDBACK LINEAGE VERSION APPEND ERROR", error);
    throw error;
  }

  const version = toLineageVersion(data);
  await updateCurrentLineagePointers(lineage.id, input.artifactType, version.id);
  return version;
}

export async function getFeedbackLineage(input: {
  generationRunId?: string;
  legacyRunId?: string;
  channel: ContentChannel;
}): Promise<{ lineage: FeedbackLineage; versions: FeedbackLineageVersion[] } | null> {
  const context = await requireWorkspaceContext();
  const run = await resolveRun(input);
  if (!run) return null;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("feedback_lineages")
    .select(lineageSelect)
    .eq("organization_id", context.organization.id)
    .eq("generation_run_id", run.id)
    .eq("channel", input.channel)
    .maybeSingle<FeedbackLineageRow>();

  if (error) {
    console.error("FEEDBACK LINEAGE GET ERROR", error);
    throw error;
  }

  if (!data) return null;

  const lineage = toLineage(data);
  const { data: versionRows, error: versionsError } = await supabase
    .from("feedback_lineage_versions")
    .select(versionSelect)
    .eq("organization_id", context.organization.id)
    .eq("feedback_lineage_id", lineage.id)
    .order("version_number", { ascending: true })
    .returns<FeedbackLineageVersionRow[]>();

  if (versionsError) {
    console.error("FEEDBACK LINEAGE VERSION LIST ERROR", versionsError);
    throw versionsError;
  }

  return { lineage, versions: (versionRows ?? []).map(toLineageVersion) };
}

export async function listFeedbackLineageVersions(): Promise<FeedbackLineageVersion[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("feedback_lineage_versions")
    .select(versionSelect)
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .returns<FeedbackLineageVersionRow[]>();

  if (error) {
    console.error("FEEDBACK LINEAGE VERSION GLOBAL LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toLineageVersion);
}

export async function updateLineageVersionFeedback(input: {
  versionId: string;
  status: FeedbackStatus;
  notes: string;
  tags?: string[];
}): Promise<FeedbackLineageVersion | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data: current, error: currentError } = await supabase
    .from("feedback_lineage_versions")
    .select(versionSelect)
    .eq("organization_id", context.organization.id)
    .eq("id", input.versionId)
    .maybeSingle<FeedbackLineageVersionRow>();

  if (currentError) {
    console.error("FEEDBACK LINEAGE VERSION CURRENT GET ERROR", currentError);
    throw currentError;
  }

  const { data, error } = await supabase
    .from("feedback_lineage_versions")
    .update({
      status: input.status,
      notes: input.notes,
      ...(input.tags ? { tags: input.tags } : {}),
      metadata: { ...(current?.metadata ?? {}), updated_at: new Date().toISOString() },
    })
    .eq("organization_id", context.organization.id)
    .eq("id", input.versionId)
    .select(versionSelect)
    .maybeSingle<FeedbackLineageVersionRow>();

  if (error) {
    console.error("FEEDBACK LINEAGE VERSION UPDATE ERROR", error);
    throw error;
  }

  return data ? toLineageVersion(data) : null;
}

export async function updateCurrentLineagePointers(
  lineageId: string,
  artifactType: FeedbackTarget,
  versionId: string | null
): Promise<FeedbackLineage | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const pointerColumn =
    artifactType === "caption"
      ? "current_caption_version_id"
      : artifactType === "visualPrompt"
        ? "current_visual_prompt_version_id"
        : "current_image_version_id";
  const { data, error } = await supabase
    .from("feedback_lineages")
    .update({ [pointerColumn]: versionId, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organization.id)
    .eq("id", lineageId)
    .select(lineageSelect)
    .maybeSingle<FeedbackLineageRow>();

  if (error) {
    console.error("FEEDBACK LINEAGE POINTER UPDATE ERROR", error);
    throw error;
  }

  return data ? toLineage(data) : null;
}

export async function createLineageArtifact(input: {
  legacyRunId: string;
  channel: ContentChannel;
  artifactType: FeedbackTarget;
  content?: string | null;
  metadata?: JsonObject;
}): Promise<GenerationArtifact | null> {
  const artifactType = normalizeArtifactType(input.artifactType);

  return createGenerationArtifact({
    legacyRunId: input.legacyRunId,
    channel: input.channel,
    artifactType,
    content: input.content,
    metadata: input.metadata ?? {},
  }).catch(() => null);
}
