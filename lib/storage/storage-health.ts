import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeError } from "@/lib/errors/error-normalization";

export async function verifyStorageBucketExists(bucket = "generated-assets") {
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });

  if (error) {
    return { ok: false as const, error: normalizeError(error, "Storage bucket is missing.") };
  }

  return { ok: true as const };
}

export async function safeCreateSignedUrl(bucket: string, storagePath: string, expiresIn = 600) {
  if (!storagePath || storagePath.includes("..")) return null;

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
    if (error) {
      console.error("[storage] signed url failed", normalizeError(error));
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    console.error("[storage] signed url crashed", normalizeError(error));
    return null;
  }
}

export async function safeUploadAsset(bucket: string, storagePath: string, body: BodyInit, options?: { contentType?: string; upsert?: boolean }) {
  if (!storagePath || storagePath.includes("..")) {
    return { ok: false as const, error: { message: "Invalid storage path.", code: "invalid_storage_path" } };
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });
    if (error) return { ok: false as const, error: normalizeError(error, "Asset upload failed.") };
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: normalizeError(error, "Asset upload failed.") };
  }
}
