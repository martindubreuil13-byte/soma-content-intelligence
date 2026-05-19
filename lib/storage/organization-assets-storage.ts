import path from "path";
import {
  createOrganizationAsset,
  linkReplacementAsset,
  type CreateOrganizationAssetInput,
  type OrganizationAsset,
  type OrganizationAssetType,
} from "@/lib/db/organization-assets-db";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

const bucketName = "generated-assets";
const maxAssetSizeBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

type UploadOrganizationAssetInput = {
  assetType: OrganizationAssetType;
  name: string;
  description?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  previousAssetId?: string | null;
};

export type StorageValidationResult =
  | { ok: true }
  | { ok: false; reason: "bucket_missing" | "permission_problem" | "upload_failed" | "signed_url_failed"; message: string };

function safeStorageSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160) || "asset";
}

function getFileExtension(filename: string, mimeType: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension) return extension;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "text/plain") return ".txt";
  return "";
}

function classifyStorageError(error: { message?: string; statusCode?: string | number } | null): StorageValidationResult {
  const message = error?.message ?? "Storage request failed.";
  const lowerMessage = message.toLowerCase();
  const statusCode = String(error?.statusCode ?? "");

  if (statusCode === "404" || lowerMessage.includes("bucket") || lowerMessage.includes("not found")) {
    return { ok: false, reason: "bucket_missing", message: "Storage bucket generated-assets is missing." };
  }

  if (statusCode === "401" || statusCode === "403" || lowerMessage.includes("row-level security") || lowerMessage.includes("permission")) {
    return {
      ok: false,
      reason: "permission_problem",
      message: "Storage policy blocked this request. Check generated-assets storage.objects RLS policies.",
    };
  }

  return { ok: false, reason: "upload_failed", message };
}

export async function validateOrganizationAssetStorage(): Promise<StorageValidationResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(bucketName).list("", { limit: 1 });

  return error ? classifyStorageError(error) : { ok: true };
}

export async function uploadOrganizationAsset(file: File, input: UploadOrganizationAssetInput): Promise<OrganizationAsset> {
  const context = await requireWorkspaceContext();

  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Unsupported file type. Use PNG, JPEG, WebP, PDF, or plain text.");
  }

  if (file.size > maxAssetSizeBytes) {
    throw new Error("File is too large. The current limit is 10MB.");
  }

  const assetId = crypto.randomUUID();
  const originalFilename = file.name || "asset";
  const safeFilename = `${safeStorageSegment(path.basename(originalFilename, path.extname(originalFilename)))}${getFileExtension(originalFilename, file.type)}`;
  const storagePath = [
    "organizations",
    context.organization.id,
    "assets",
    safeStorageSegment(input.assetType),
    assetId,
    safeFilename,
  ].join("/");
  const bytes = await file.arrayBuffer();
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(bucketName).upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    const result = classifyStorageError(error);
    throw new Error(result.ok ? "Storage request failed." : result.message);
  }

  const createInput: CreateOrganizationAssetInput = {
    id: assetId,
    assetType: input.assetType,
    name: input.name,
    description: input.description ?? null,
    storageBucket: bucketName,
    storagePath,
    mimeType: file.type,
    sizeBytes: file.size,
    originalFilename,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    previousAssetId: input.previousAssetId ?? null,
  };

  return createOrganizationAsset(createInput);
}

export async function replaceOrganizationAssetFile(
  currentAsset: OrganizationAsset,
  file: File,
  input: Partial<UploadOrganizationAssetInput> = {}
): Promise<OrganizationAsset> {
  const replacement = await uploadOrganizationAsset(file, {
    assetType: input.assetType ?? currentAsset.assetType,
    name: input.name ?? currentAsset.name,
    description: input.description ?? currentAsset.description,
    tags: input.tags ?? currentAsset.tags,
    metadata: {
      ...currentAsset.metadata,
      ...(input.metadata ?? {}),
      lifecycle_action: "replacement",
      previous_asset_id: currentAsset.id,
    },
    previousAssetId: currentAsset.id,
  });

  await linkReplacementAsset(currentAsset.id, replacement.id);

  return replacement;
}

export async function getOrganizationAssetSignedUrl(asset: OrganizationAsset, expiresInSeconds = 60 * 10) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage
    .from(asset.storageBucket)
    .createSignedUrl(asset.storagePath, expiresInSeconds);

  if (error) {
    const result = classifyStorageError(error);
    throw new Error(result.ok ? "Signed URL creation failed." : result.reason === "upload_failed" ? "Signed URL creation failed." : result.message);
  }

  return data.signedUrl;
}

export async function deleteOrganizationAssetStorage(asset: OrganizationAsset): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(asset.storageBucket).remove([asset.storagePath]);

  if (error) {
    const result = classifyStorageError(error);
    throw new Error(result.ok ? "Storage delete failed." : result.message);
  }
}
