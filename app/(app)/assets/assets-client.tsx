"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Archive, FileText, ImageIcon, Loader2, Pencil, Plus, RefreshCw, RotateCcw, Trash2, Upload } from "lucide-react";

type Asset = {
  id: string;
  assetType: string;
  name: string;
  description: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  tags: string[];
  isActive: boolean;
  replacedByAssetId: string | null;
  previousAssetId: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  signedUrl?: string | null;
};

const assetTypes = [
  { value: "logo", label: "Logo" },
  { value: "screenshot", label: "Screenshot" },
  { value: "visual_reference", label: "Visual reference" },
  { value: "brand_document", label: "Brand document" },
  { value: "training_example", label: "Training example" },
  { value: "prompt_reference", label: "Prompt reference" },
  { value: "product_image", label: "Product image" },
  { value: "other", label: "Other" },
];

function formatBytes(value: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function AssetsClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetType, setAssetType] = useState("logo");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const visibleAssets = useMemo(() => assets.filter((asset) => !asset.deletedAt), [assets]);

  async function loadAssets() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/assets?is_active=all", { cache: "no-store" });
      const data = (await response.json()) as { ok?: boolean; assets?: Asset[]; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not load assets.");
      setAssets(data.assets ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load assets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!file) {
      setMessage("Choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("asset_type", assetType);
      formData.append("name", name.trim() || file.name);
      formData.append("description", description.trim());
      formData.append("tags", tags);

      const response = await fetch("/api/assets", { method: "POST", body: formData });
      const data = (await response.json()) as { ok?: boolean; asset?: Asset; error?: string };
      if (!response.ok || !data.ok || !data.asset) throw new Error(data.error ?? "Upload failed.");

      setAssets((current) => [data.asset as Asset, ...current]);
      setName("");
      setDescription("");
      setTags("");
      setFile(null);
      event.currentTarget.reset();
      setMessage("Asset uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function startEdit(asset: Asset) {
    setEditingId(asset.id);
    setEditName(asset.name);
    setEditDescription(asset.description ?? "");
    setEditTags(asset.tags.join(", "));
  }

  async function saveMetadata(assetId: string) {
    setMessage(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          tags: editTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; asset?: Asset; error?: string };
      if (!response.ok || !data.ok || !data.asset) throw new Error(data.error ?? "Could not update asset.");
      setAssets((current) => current.map((asset) => (asset.id === assetId ? data.asset as Asset : asset)));
      setEditingId(null);
      setMessage("Asset updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update asset.");
    }
  }

  async function setAssetActive(assetId: string, isActive: boolean) {
    setMessage(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = (await response.json()) as { ok?: boolean; asset?: Asset; error?: string };
      if (!response.ok || !data.ok || !data.asset) throw new Error(data.error ?? "Could not update asset.");
      setAssets((current) => current.map((asset) => (asset.id === assetId ? data.asset as Asset : asset)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update asset.");
    }
  }

  async function replaceAsset(asset: Asset, replacementFile: File | null) {
    if (!replacementFile) return;
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", replacementFile);
      formData.append("asset_type", asset.assetType);
      formData.append("name", asset.name);
      formData.append("description", asset.description ?? "");
      formData.append("tags", asset.tags.join(", "));
      const response = await fetch(`/api/assets/${asset.id}`, { method: "POST", body: formData });
      const data = (await response.json()) as { ok?: boolean; asset?: Asset; replacedAssetId?: string; error?: string };
      if (!response.ok || !data.ok || !data.asset) throw new Error(data.error ?? "Could not replace asset.");
      setAssets((current) => [
        data.asset as Asset,
        ...current.map((item) =>
          item.id === asset.id
            ? { ...item, isActive: false, archivedAt: new Date().toISOString(), replacedByAssetId: data.asset?.id ?? null }
            : item
        ),
      ]);
      setMessage("Asset replaced. The previous version is preserved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not replace asset.");
    }
  }

  async function deleteAsset(assetId: string) {
    setMessage(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      const data = (await response.json()) as { ok?: boolean; deleted?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not remove asset.");
      setAssets((current) => current.map((asset) => (asset.id === assetId ? { ...asset, isActive: false, deletedAt: new Date().toISOString() } : asset)));
      setMessage("Asset archived.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove asset.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-7 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-peach/55">Asset Library</p>
        <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Reusable brand assets</h1>
      </div>

      {message ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white/70">
          {message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
        <form onSubmit={(event) => void handleUpload(event)} className="grid gap-4 lg:grid-cols-[180px_1fr_1fr_1fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Type</span>
            <select
              value={assetType}
              onChange={(event) => setAssetType(event.target.value)}
              className="h-11 rounded-2xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm text-white outline-none"
            >
              {assetTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ALPA logo, dashboard screenshot..."
              className="h-11 rounded-2xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Description</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="How SOMA should use this"
              className="h-11 rounded-2xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="brand, product, proof"
              className="h-11 rounded-2xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          </label>

          <div className="grid gap-2">
            <label className="flex h-11 min-w-48 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white">
              <Upload size={16} />
              <span className="max-w-36 truncate">{file ? file.name : "Choose file"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            <button
              type="submit"
              disabled={uploading}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-peach px-4 text-sm font-bold text-charcoal transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Upload
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-white/55">
          <Loader2 size={16} className="animate-spin" />
          Loading assets
        </div>
      ) : visibleAssets.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleAssets.map((asset) => {
            const isImage = asset.mimeType?.startsWith("image/");
            const isEditing = editingId === asset.id;
            return (
              <article key={asset.id} className={`overflow-hidden rounded-3xl border bg-white/[0.045] shadow-2xl shadow-black/20 ${asset.isActive ? "border-white/[0.08]" : "border-peach/20 opacity-70"}`}>
                <div className="flex aspect-[16/10] items-center justify-center bg-black/25">
                  {isImage && asset.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.signedUrl} alt={asset.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-peach">
                      {isImage ? <ImageIcon size={26} /> : <FileText size={26} />}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="h-9 w-full rounded-xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm font-semibold text-white outline-none"
                        />
                      ) : (
                        <p className="truncate text-base font-semibold text-white">{asset.name}</p>
                      )}
                      <p className="mt-1 text-xs capitalize text-white/38">
                        {asset.assetType.replace(/_/g, " ")} · {formatDate(asset.createdAt)} {asset.sizeBytes ? `· ${formatBytes(asset.sizeBytes)}` : ""}
                        {!asset.isActive ? " · inactive" : ""}
                        {asset.previousAssetId ? " · replacement" : ""}
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="mt-3 grid gap-2">
                      <textarea
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        className="min-h-20 rounded-xl border border-white/[0.08] bg-charcoal/80 px-3 py-2 text-sm text-white outline-none"
                      />
                      <input
                        value={editTags}
                        onChange={(event) => setEditTags(event.target.value)}
                        className="h-9 rounded-xl border border-white/[0.08] bg-charcoal/80 px-3 text-sm text-white outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => void saveMetadata(asset.id)} className="rounded-xl bg-peach px-3 py-2 text-xs font-bold text-charcoal">Save</button>
                        <button onClick={() => setEditingId(null)} className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-bold text-white/60">Cancel</button>
                      </div>
                    </div>
                  ) : asset.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-white/55">{asset.description}</p>
                  ) : null}
                  {!isEditing && asset.tags.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {asset.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-1 text-[11px] text-white/48">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {!isEditing ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button onClick={() => startEdit(asset)} className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white">
                        <Pencil size={13} /> Edit
                      </button>
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white">
                        <RefreshCw size={13} /> Replace
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                          className="sr-only"
                          onChange={(event) => void replaceAsset(asset, event.target.files?.[0] ?? null)}
                        />
                      </label>
                      {asset.isActive ? (
                        <button onClick={() => void setAssetActive(asset.id, false)} className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white">
                          <Archive size={13} /> Deactivate
                        </button>
                      ) : (
                        <button onClick={() => void setAssetActive(asset.id, true)} className="flex items-center justify-center gap-2 rounded-xl border border-peach/25 px-3 py-2 text-xs font-semibold text-peach/80 transition hover:bg-peach/10">
                          <RotateCcw size={13} /> Reactivate
                        </button>
                      )}
                      <button onClick={() => void deleteAsset(asset.id)} className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.035] p-10 text-center text-white/52">
          Upload logos, screenshots, brand files, or references so SOMA can reuse them later.
        </div>
      )}
    </div>
  );
}
