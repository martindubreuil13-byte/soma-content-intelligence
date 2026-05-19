import { NextResponse } from "next/server";
import {
  deleteOrganizationAsset,
  getOrganizationAsset,
  isOrganizationAssetType,
  updateOrganizationAsset,
  type OrganizationAsset,
} from "@/lib/db/organization-assets-db";
import {
  getOrganizationAssetSignedUrl,
  replaceOrganizationAssetFile,
  validateOrganizationAssetStorage,
} from "@/lib/storage/organization-assets-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

function parseTags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
}

function parseFormTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

async function serializeAsset(asset: OrganizationAsset) {
  const signedUrl = asset.mimeType?.startsWith("image/")
    ? await getOrganizationAssetSignedUrl(asset).catch(() => null)
    : null;

  return { ...asset, signedUrl };
}

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const asset = await getOrganizationAsset(assetId);

    if (!asset) {
      return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, asset: await serializeAsset(asset) });
  } catch (error) {
    console.error("[asset] Get failed", error);
    return NextResponse.json({ ok: false, error: "Could not load this asset." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch = {
      ...(isOrganizationAssetType(body.asset_type) ? { assetType: body.asset_type } : {}),
      ...(typeof body.name === "string" ? { name: body.name.trim().slice(0, 180) } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim().slice(0, 2000) || null } : {}),
      ...(Array.isArray(body.tags) ? { tags: parseTags(body.tags) ?? [] } : {}),
      ...(body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? { metadata: body.metadata as Record<string, unknown> }
        : {}),
      ...(typeof body.is_active === "boolean" ? { isActive: body.is_active } : {}),
    };
    const asset = await updateOrganizationAsset(assetId, patch);

    if (!asset) {
      return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, asset: await serializeAsset(asset) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    console.error("[asset] Update failed", { assetId, message });
    return NextResponse.json({ ok: false, error: "Could not update this asset." }, { status: 400 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const storageStatus = await validateOrganizationAssetStorage();
    if (!storageStatus.ok) {
      return NextResponse.json({ ok: false, error: storageStatus.message, reason: storageStatus.reason }, { status: 503 });
    }

    const currentAsset = await getOrganizationAsset(assetId);
    if (!currentAsset || currentAsset.deletedAt) {
      return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const assetType = formData.get("asset_type");
    const name = formData.get("name");
    const description = formData.get("description");
    const parsedTags = parseFormTags(formData.get("tags"));

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Choose a replacement file." }, { status: 400 });
    }

    const replacement = await replaceOrganizationAssetFile(currentAsset, file, {
      assetType: isOrganizationAssetType(assetType) ? assetType : currentAsset.assetType,
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 180) : currentAsset.name,
      description:
        typeof description === "string" && description.trim()
          ? description.trim().slice(0, 2000)
          : currentAsset.description,
      tags: parsedTags.length ? parsedTags : currentAsset.tags,
      metadata: {
        replaced_from: "asset_library",
      },
    });

    return NextResponse.json(
      { ok: true, asset: await serializeAsset(replacement), replacedAssetId: currentAsset.id },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Replacement failed.";
    console.error("[asset] Replacement failed", { assetId, message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const asset = await getOrganizationAsset(assetId);

    if (!asset) {
      return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
    }

    await deleteOrganizationAsset(assetId);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    console.error("[asset] Delete failed", { assetId, message });
    return NextResponse.json({ ok: false, error: "Could not remove this asset." }, { status: 400 });
  }
}
