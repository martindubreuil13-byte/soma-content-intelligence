import {
  listOrganizationAssets,
  type OrganizationAsset,
  type OrganizationAssetFilters,
  type OrganizationAssetType,
} from "@/lib/db/organization-assets-db";
import { getOrganizationAssetSignedUrl } from "@/lib/storage/organization-assets-storage";

export type PromptContextAsset = {
  id: string;
  assetType: OrganizationAssetType;
  name: string;
  description: string | null;
  mimeType: string | null;
  tags: string[];
  signedUrl: string | null;
  storagePath: string;
  createdAt: string;
};

type AssetPromptFilters = OrganizationAssetFilters & {
  limit?: number;
  includeSignedUrls?: boolean;
};

async function toPromptContextAsset(asset: OrganizationAsset, includeSignedUrls: boolean): Promise<PromptContextAsset> {
  const shouldSign = includeSignedUrls && asset.mimeType?.startsWith("image/");
  const signedUrl = shouldSign
    ? await getOrganizationAssetSignedUrl(asset).catch(() => null)
    : null;

  return {
    id: asset.id,
    assetType: asset.assetType,
    name: asset.name,
    description: asset.description,
    mimeType: asset.mimeType,
    tags: asset.tags,
    signedUrl,
    storagePath: asset.storagePath,
    createdAt: asset.createdAt,
  };
}

export async function getAssetsForPromptContext(filters: AssetPromptFilters = {}): Promise<PromptContextAsset[]> {
  const assets = await listOrganizationAssets({
    assetType: filters.assetType,
    isActive: filters.isActive ?? true,
    tag: filters.tag,
  });
  const limitedAssets = assets.slice(0, filters.limit ?? 24);

  return Promise.all(limitedAssets.map((asset) => toPromptContextAsset(asset, filters.includeSignedUrls ?? true)));
}

export async function getBrandVisualReferences(): Promise<PromptContextAsset[]> {
  const assets = await Promise.all([
    getAssetsForPromptContext({ assetType: "logo", limit: 8 }),
    getAssetsForPromptContext({ assetType: "screenshot", limit: 12 }),
    getAssetsForPromptContext({ assetType: "visual_reference", limit: 12 }),
    getAssetsForPromptContext({ assetType: "product_image", limit: 12 }),
  ]);

  return assets.flat();
}

export async function getTrainingReferenceAssets(): Promise<PromptContextAsset[]> {
  const assets = await Promise.all([
    getAssetsForPromptContext({ assetType: "training_example", limit: 16, includeSignedUrls: false }),
    getAssetsForPromptContext({ assetType: "prompt_reference", limit: 16, includeSignedUrls: false }),
    getAssetsForPromptContext({ assetType: "brand_document", limit: 16, includeSignedUrls: false }),
  ]);

  return assets.flat();
}
