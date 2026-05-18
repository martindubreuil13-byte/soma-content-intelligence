import path from "path";
import { createGenerationAsset, createOutputSnapshot, listGenerationAssets } from "@/lib/db/generation-assets-db";
import { getGenerationRunByLegacyRunId } from "@/lib/db/generation-runs-db";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

const generatedAssetsBucket = "generated-assets";

type JsonObject = Record<string, unknown>;

type StoragePathInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  channel?: string | null;
  filename: string;
};

type UploadGeneratedImageInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  channel: string;
  filename: string;
  bytes: Buffer | Uint8Array | ArrayBuffer;
  artifactId?: string | null;
  metadata?: JsonObject;
};

type UploadArtifactTextInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
  filename: string;
  content: string;
  artifactId?: string | null;
  assetType?: string;
  metadata?: JsonObject;
};

type UploadJsonSnapshotInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  generationChannelId?: string | null;
  channel?: string | null;
  snapshotType: string;
  filename?: string;
  content: JsonObject;
  metadata?: JsonObject;
};

type GetSignedImageUrlInput = {
  generationRunId?: string | null;
  legacyRunId?: string | null;
  channel: string;
  filename?: string | null;
  expiresInSeconds?: number;
};

function safeStorageSegment(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

function inferMimeType(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".json") return "application/json";
  if (extension === ".txt") return "text/plain; charset=utf-8";

  return "application/octet-stream";
}

async function resolveGenerationRunId(input: { generationRunId?: string | null; legacyRunId?: string | null }) {
  if (input.generationRunId) return input.generationRunId;
  if (!input.legacyRunId) return null;

  const run = await getGenerationRunByLegacyRunId(input.legacyRunId);
  return run?.id ?? null;
}

async function buildStoragePath(input: StoragePathInput) {
  const context = await requireWorkspaceContext();
  const runId = await resolveGenerationRunId(input);
  const runSegment = runId ?? input.legacyRunId ?? "unlinked";
  const channelSegment = input.channel ? safeStorageSegment(input.channel) : "run";
  const filename = safeStorageSegment(input.filename);

  return {
    organizationId: context.organization.id,
    generationRunId: runId,
    storagePath: [
      "organizations",
      context.organization.id,
      "runs",
      safeStorageSegment(runSegment),
      channelSegment,
      filename,
    ].join("/"),
  };
}

function byteLength(bytes: Buffer | Uint8Array | ArrayBuffer | string) {
  if (typeof bytes === "string") return Buffer.byteLength(bytes, "utf8");
  if (bytes instanceof ArrayBuffer) return bytes.byteLength;
  return bytes.byteLength;
}

export async function uploadGeneratedImage(input: UploadGeneratedImageInput) {
  const supabase = await createServerSupabase();
  const { generationRunId, storagePath } = await buildStoragePath(input);
  const mimeType = inferMimeType(input.filename);
  const { error } = await supabase.storage
    .from(generatedAssetsBucket)
    .upload(storagePath, input.bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("GENERATED IMAGE STORAGE UPLOAD ERROR", error);
    throw error;
  }

  const asset = await createGenerationAsset({
    generationRunId,
    legacyRunId: input.legacyRunId,
    channel: input.channel,
    artifactId: input.artifactId ?? null,
    assetType: "generated_image",
    storageBucket: generatedAssetsBucket,
    storagePath,
    mimeType,
    sizeBytes: byteLength(input.bytes),
    metadata: input.metadata ?? {},
  });

  return {
    bucket: generatedAssetsBucket,
    path: storagePath,
    asset,
  };
}

export async function getSignedImageUrl(input: GetSignedImageUrlInput) {
  const generationRunId = await resolveGenerationRunId(input);
  if (!generationRunId) return null;

  const matchingAssets = await listGenerationAssets({
    generationRunId,
    channel: input.channel,
    assetType: "generated_image",
  });
  const requestedFile = input.filename ?? null;
  const asset = requestedFile
    ? matchingAssets.find((item) => item.storagePath.endsWith(`/${safeStorageSegment(requestedFile)}`))
    : matchingAssets[0];

  if (!asset) return null;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage
    .from(asset.storageBucket)
    .createSignedUrl(asset.storagePath, input.expiresInSeconds ?? 60 * 10);

  if (error) {
    console.error("GENERATED IMAGE SIGNED URL ERROR", error);
    throw error;
  }

  return data.signedUrl;
}

export async function uploadArtifactText(input: UploadArtifactTextInput) {
  const supabase = await createServerSupabase();
  const { generationRunId, storagePath } = await buildStoragePath(input);
  const mimeType = inferMimeType(input.filename);
  const { error } = await supabase.storage
    .from(generatedAssetsBucket)
    .upload(storagePath, input.content, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("ARTIFACT TEXT STORAGE UPLOAD ERROR", error);
    throw error;
  }

  const asset = await createGenerationAsset({
    generationRunId,
    legacyRunId: input.legacyRunId,
    generationChannelId: input.generationChannelId,
    channel: input.channel,
    artifactId: input.artifactId ?? null,
    assetType: input.assetType ?? "artifact_text",
    storageBucket: generatedAssetsBucket,
    storagePath,
    mimeType,
    sizeBytes: byteLength(input.content),
    metadata: input.metadata ?? {},
  });

  return {
    bucket: generatedAssetsBucket,
    path: storagePath,
    asset,
  };
}

export async function uploadJsonSnapshot(input: UploadJsonSnapshotInput) {
  const snapshot = await createOutputSnapshot({
    generationRunId: input.generationRunId,
    legacyRunId: input.legacyRunId,
    generationChannelId: input.generationChannelId,
    channel: input.channel,
    snapshotType: input.snapshotType,
    content: input.content,
  });
  const filename = input.filename ?? `${input.snapshotType}.json`;
  const supabase = await createServerSupabase();
  const { generationRunId, storagePath } = await buildStoragePath({ ...input, filename });
  const serialized = `${JSON.stringify(input.content, null, 2)}\n`;
  const mimeType = inferMimeType(filename);
  const { error } = await supabase.storage
    .from(generatedAssetsBucket)
    .upload(storagePath, serialized, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("JSON SNAPSHOT STORAGE UPLOAD ERROR", error);
    throw error;
  }

  const asset = await createGenerationAsset({
    generationRunId,
    legacyRunId: input.legacyRunId,
    generationChannelId: input.generationChannelId,
    channel: input.channel,
    assetType: `${input.snapshotType}_snapshot`,
    storageBucket: generatedAssetsBucket,
    storagePath,
    mimeType,
    sizeBytes: byteLength(serialized),
    metadata: {
      snapshot_id: snapshot.id,
      ...(input.metadata ?? {}),
    },
  });

  return {
    bucket: generatedAssetsBucket,
    path: storagePath,
    asset,
    snapshot,
  };
}
