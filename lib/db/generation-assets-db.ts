import { createServerSupabase } from "@/lib/supabase/server";
import {
  getGenerationRunByLegacyRunId,
  upsertGenerationChannel,
} from "@/lib/db/generation-runs-db";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type JsonObject = Record<string, unknown>;

export type GenerationAsset = {
  id: string;
  organizationId: string;
  generationRunId: string | null;
  generationChannelId: string | null;
  artifactId: string | null;
  assetType: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  metadata: JsonObject;
  createdAt: string;
};

export type GenerationOutputSnapshot = {
  id: string;
  organizationId: string;
  generationRunId: string | null;
  generationChannelId: string | null;
  snapshotType: string;
  content: JsonObject;
  createdAt: string;
};

type GenerationAssetRow = {
  id: string;
  organization_id: string;
  generation_run_id: string | null;
  generation_channel_id: string | null;
  artifact_id: string | null;
  asset_type: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  metadata: JsonObject | null;
  created_at: string;
};

type GenerationOutputSnapshotRow = {
  id: string;
  organization_id: string;
  generation_run_id: string | null;
  generation_channel_id: string | null;
  snapshot_type: string;
  content: JsonObject | null;
  created_at: string;
};

export type CreateGenerationAssetInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
  artifactId?: string | null;
  assetType: string;
  storageBucket: string;
  storagePath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  metadata?: JsonObject;
};

export type ListGenerationAssetsInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
  assetType?: string | null;
};

export type CreateOutputSnapshotInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
  snapshotType: string;
  content?: JsonObject;
};

export type ListOutputSnapshotsInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
  snapshotType?: string | null;
};

const assetSelect =
  "id, organization_id, generation_run_id, generation_channel_id, artifact_id, asset_type, storage_bucket, storage_path, mime_type, size_bytes, metadata, created_at";
const snapshotSelect =
  "id, organization_id, generation_run_id, generation_channel_id, snapshot_type, content, created_at";

function toAsset(row: GenerationAssetRow): GenerationAsset {
  return {
    id: row.id,
    organizationId: row.organization_id,
    generationRunId: row.generation_run_id,
    generationChannelId: row.generation_channel_id,
    artifactId: row.artifact_id,
    assetType: row.asset_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toSnapshot(row: GenerationOutputSnapshotRow): GenerationOutputSnapshot {
  return {
    id: row.id,
    organizationId: row.organization_id,
    generationRunId: row.generation_run_id,
    generationChannelId: row.generation_channel_id,
    snapshotType: row.snapshot_type,
    content: row.content ?? {},
    createdAt: row.created_at,
  };
}

async function resolveRunId(input: { generationRunId?: string | null; legacyRunId?: string | null }) {
  if (input.generationRunId) return input.generationRunId;
  if (!input.legacyRunId) return null;

  const run = await getGenerationRunByLegacyRunId(input.legacyRunId);
  return run?.id ?? null;
}

async function resolveChannelId(input: {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
}) {
  if (input.generationChannelId) return input.generationChannelId;
  if (!input.channel) return null;

  const runId = await resolveRunId(input);
  if (!runId) return null;

  const channel = await upsertGenerationChannel({
    runId,
    channel: input.channel,
    status: "completed",
    metadata: input.legacyRunId ? { legacy_run_id: input.legacyRunId } : {},
  });
  return channel.id;
}

export async function createGenerationAsset(input: CreateGenerationAssetInput): Promise<GenerationAsset> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const generationRunId = await resolveRunId(input);
  const generationChannelId = await resolveChannelId({
    ...input,
    generationRunId,
  });
  const { data, error } = await supabase
    .from("generation_assets")
    .insert({
      organization_id: context.organization.id,
      generation_run_id: generationRunId,
      generation_channel_id: generationChannelId,
      artifact_id: input.artifactId ?? null,
      asset_type: input.assetType,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      metadata: input.metadata ?? {},
    })
    .select(assetSelect)
    .single<GenerationAssetRow>();

  if (error) {
    console.error("GENERATION ASSET CREATE ERROR", error);
    throw error;
  }

  return toAsset(data);
}

export async function listGenerationAssets(input: ListGenerationAssetsInput = {}): Promise<GenerationAsset[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const generationRunId = await resolveRunId(input);
  const generationChannelId = await resolveChannelId({
    ...input,
    generationRunId,
  });
  let query = supabase
    .from("generation_assets")
    .select(assetSelect)
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });

  if (generationRunId) query = query.eq("generation_run_id", generationRunId);
  if (generationChannelId) query = query.eq("generation_channel_id", generationChannelId);
  if (input.assetType) query = query.eq("asset_type", input.assetType);

  const { data, error } = await query.returns<GenerationAssetRow[]>();

  if (error) {
    console.error("GENERATION ASSET LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toAsset);
}

export async function createOutputSnapshot(input: CreateOutputSnapshotInput): Promise<GenerationOutputSnapshot> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const generationRunId = await resolveRunId(input);
  const generationChannelId = await resolveChannelId({
    ...input,
    generationRunId,
  });
  const { data, error } = await supabase
    .from("generation_output_snapshots")
    .insert({
      organization_id: context.organization.id,
      generation_run_id: generationRunId,
      generation_channel_id: generationChannelId,
      snapshot_type: input.snapshotType,
      content: input.content ?? {},
    })
    .select(snapshotSelect)
    .single<GenerationOutputSnapshotRow>();

  if (error) {
    console.error("GENERATION OUTPUT SNAPSHOT CREATE ERROR", error);
    throw error;
  }

  return toSnapshot(data);
}

export async function listOutputSnapshots(input: ListOutputSnapshotsInput = {}): Promise<GenerationOutputSnapshot[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const generationRunId = await resolveRunId(input);
  const generationChannelId = await resolveChannelId({
    ...input,
    generationRunId,
  });
  let query = supabase
    .from("generation_output_snapshots")
    .select(snapshotSelect)
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });

  if (generationRunId) query = query.eq("generation_run_id", generationRunId);
  if (generationChannelId) query = query.eq("generation_channel_id", generationChannelId);
  if (input.snapshotType) query = query.eq("snapshot_type", input.snapshotType);

  const { data, error } = await query.returns<GenerationOutputSnapshotRow[]>();

  if (error) {
    console.error("GENERATION OUTPUT SNAPSHOT LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toSnapshot);
}
