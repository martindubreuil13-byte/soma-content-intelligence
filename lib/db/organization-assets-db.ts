import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type JsonObject = Record<string, unknown>;

export const organizationAssetTypes = [
  "logo",
  "screenshot",
  "visual_reference",
  "brand_document",
  "training_example",
  "prompt_reference",
  "product_image",
  "other",
] as const;

export type OrganizationAssetType = (typeof organizationAssetTypes)[number];

export type OrganizationAsset = {
  id: string;
  organizationId: string;
  uploadedBy: string | null;
  assetType: OrganizationAssetType;
  name: string;
  description: string | null;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  tags: string[];
  metadata: JsonObject;
  isActive: boolean;
  replacedByAssetId: string | null;
  previousAssetId: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  aiScore: number;
  aiUsageCount: number;
  recommended: boolean;
  expiresAt: string | null;
  semanticMetadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

type OrganizationAssetRow = {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  asset_type: OrganizationAssetType;
  name: string;
  description: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  original_filename: string | null;
  tags: string[] | null;
  metadata: JsonObject | null;
  is_active: boolean;
  replaced_by_asset_id: string | null;
  previous_asset_id: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  ai_score: number | null;
  ai_usage_count: number | null;
  recommended: boolean | null;
  expires_at: string | null;
  semantic_metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
};

export type CreateOrganizationAssetInput = {
  id?: string;
  assetType: OrganizationAssetType;
  name: string;
  description?: string | null;
  storageBucket?: string;
  storagePath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  originalFilename?: string | null;
  tags?: string[];
  metadata?: JsonObject;
  isActive?: boolean;
  previousAssetId?: string | null;
};

export type OrganizationAssetFilters = {
  assetType?: OrganizationAssetType | null;
  isActive?: boolean | null;
  tag?: string | null;
  includeDeleted?: boolean;
};

export type UpdateOrganizationAssetInput = Partial<{
  assetType: OrganizationAssetType;
  name: string;
  description: string | null;
  tags: string[];
  metadata: JsonObject;
  isActive: boolean;
  recommended: boolean;
  expiresAt: string | null;
}>;

const assetSelect =
  "id, organization_id, uploaded_by, asset_type, name, description, storage_bucket, storage_path, mime_type, size_bytes, original_filename, tags, metadata, is_active, replaced_by_asset_id, previous_asset_id, archived_at, deleted_at, ai_score, ai_usage_count, recommended, expires_at, semantic_metadata, created_at, updated_at";

export function isOrganizationAssetType(value: unknown): value is OrganizationAssetType {
  return typeof value === "string" && organizationAssetTypes.includes(value as OrganizationAssetType);
}

function toAsset(row: OrganizationAssetRow): OrganizationAsset {
  return {
    id: row.id,
    organizationId: row.organization_id,
    uploadedBy: row.uploaded_by,
    assetType: row.asset_type,
    name: row.name,
    description: row.description,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    originalFilename: row.original_filename,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    isActive: row.is_active,
    replacedByAssetId: row.replaced_by_asset_id,
    previousAssetId: row.previous_asset_id,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    aiScore: row.ai_score ?? 0,
    aiUsageCount: row.ai_usage_count ?? 0,
    recommended: row.recommended ?? false,
    expiresAt: row.expires_at,
    semanticMetadata: row.semantic_metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createOrganizationAsset(input: CreateOrganizationAssetInput): Promise<OrganizationAsset> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("organization_assets")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      organization_id: context.organization.id,
      uploaded_by: context.user.id,
      asset_type: input.assetType,
      name: input.name,
      description: input.description ?? null,
      storage_bucket: input.storageBucket ?? "generated-assets",
      storage_path: input.storagePath,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      original_filename: input.originalFilename ?? null,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      is_active: input.isActive ?? true,
      previous_asset_id: input.previousAssetId ?? null,
    })
    .select(assetSelect)
    .single<OrganizationAssetRow>();

  if (error) {
    console.error("ORGANIZATION ASSET CREATE ERROR", error);
    throw error;
  }

  return toAsset(data);
}

export async function listOrganizationAssets(filters: OrganizationAssetFilters = {}): Promise<OrganizationAsset[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  let query = supabase
    .from("organization_assets")
    .select(assetSelect)
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });

  if (filters.assetType) query = query.eq("asset_type", filters.assetType);
  if (filters.isActive !== undefined && filters.isActive !== null) query = query.eq("is_active", filters.isActive);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (!filters.includeDeleted) query = query.is("deleted_at", null);

  const { data, error } = await query.returns<OrganizationAssetRow[]>();

  if (error) {
    console.error("ORGANIZATION ASSET LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toAsset);
}

export async function getOrganizationAsset(id: string): Promise<OrganizationAsset | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("organization_assets")
    .select(assetSelect)
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .maybeSingle<OrganizationAssetRow>();

  if (error) {
    console.error("ORGANIZATION ASSET GET ERROR", error);
    throw error;
  }

  return data ? toAsset(data) : null;
}

export async function updateOrganizationAsset(
  id: string,
  input: UpdateOrganizationAssetInput
): Promise<OrganizationAsset | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const payload = {
    ...(input.assetType !== undefined ? { asset_type: input.assetType } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.isActive === true ? { archived_at: null, deleted_at: null } : {}),
    ...(input.recommended !== undefined ? { recommended: input.recommended } : {}),
    ...(input.expiresAt !== undefined ? { expires_at: input.expiresAt } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("organization_assets")
    .update(payload)
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select(assetSelect)
    .maybeSingle<OrganizationAssetRow>();

  if (error) {
    console.error("ORGANIZATION ASSET UPDATE ERROR", error);
    throw error;
  }

  return data ? toAsset(data) : null;
}

export async function deleteOrganizationAsset(id: string): Promise<boolean> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("organization_assets")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", id);

  if (error) {
    console.error("ORGANIZATION ASSET DELETE ERROR", error);
    throw error;
  }

  return true;
}

export async function archiveOrganizationAsset(id: string): Promise<OrganizationAsset | null> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("organization_assets")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .is("deleted_at", null)
    .select(assetSelect)
    .maybeSingle<OrganizationAssetRow>();

  if (error) {
    console.error("ORGANIZATION ASSET ARCHIVE ERROR", error);
    throw error;
  }

  return data ? toAsset(data) : null;
}

export async function reactivateOrganizationAsset(id: string): Promise<OrganizationAsset | null> {
  return updateOrganizationAsset(id, { isActive: true });
}

export async function linkReplacementAsset(oldAssetId: string, newAssetId: string): Promise<void> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("organization_assets")
    .update({
      replaced_by_asset_id: newAssetId,
      is_active: false,
      archived_at: now,
      updated_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", oldAssetId)
    .is("deleted_at", null);

  if (error) {
    console.error("ORGANIZATION ASSET REPLACEMENT LINK ERROR", error);
    throw error;
  }
}
