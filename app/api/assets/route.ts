import {
  isOrganizationAssetType,
  listOrganizationAssets,
  type OrganizationAsset,
} from "@/lib/db/organization-assets-db";
import { errorResponse, internalServerError, successResponse, validationError } from "@/lib/http/api-response";
import {
  getOrganizationAssetSignedUrl,
  uploadOrganizationAsset,
  validateOrganizationAssetStorage,
} from "@/lib/storage/organization-assets-storage";

export const runtime = "nodejs";

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
    }
  } catch {
    // Comma-separated tags are the simple UX path.
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

async function withSignedUrl(asset: OrganizationAsset) {
  const signedUrl = asset.mimeType?.startsWith("image/")
    ? await getOrganizationAssetSignedUrl(asset).catch(() => null)
    : null;

  return { ...asset, signedUrl };
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const type = searchParams.get("asset_type");
    const activeParam = searchParams.get("is_active");
    const tag = searchParams.get("tag");
    const assets = await listOrganizationAssets({
      assetType: isOrganizationAssetType(type) ? type : null,
      isActive: activeParam === "all" || activeParam === null ? null : activeParam !== "false",
      tag,
    });
    const assetsWithUrls = await Promise.all(assets.map(withSignedUrl));

    return successResponse({ assets: assetsWithUrls });
  } catch (error) {
    return internalServerError(error);
  }
}

export async function POST(request: Request) {
  try {
    const storageStatus = await validateOrganizationAssetStorage();
    if (!storageStatus.ok) {
      return errorResponse(storageStatus.message, { status: 503, code: storageStatus.reason });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const assetType = formData.get("asset_type");
    const name = formData.get("name");
    const description = formData.get("description");

    if (!(file instanceof File)) {
      return validationError("Choose a file to upload.");
    }

    if (!isOrganizationAssetType(assetType)) {
      return validationError("Choose a valid asset type.");
    }

    if (typeof name !== "string" || !name.trim()) {
      return validationError("Asset name is required.");
    }

    const asset = await uploadOrganizationAsset(file, {
      assetType,
      name: name.trim().slice(0, 180),
      description: typeof description === "string" && description.trim() ? description.trim().slice(0, 2000) : null,
      tags: parseTags(formData.get("tags")),
      metadata: {
        uploaded_from: "asset_library",
      },
    });
    const signedUrl = asset.mimeType?.startsWith("image/")
      ? await getOrganizationAssetSignedUrl(asset).catch(() => null)
      : null;

    return successResponse({ asset: { ...asset, signedUrl } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("[assets] Upload failed", { message });
    return errorResponse(message, { status: 400, code: "asset_upload_failed" });
  }
}
