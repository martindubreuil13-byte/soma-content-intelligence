"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Link,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type {
  InjectionAppliesTo,
  InjectionSourceType,
  InjectionType,
  TrainingInjection,
} from "@/lib/training-injections";

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: InjectionType; label: string; description: string }[] = [
  { value: "caption_reference", label: "Caption Reference", description: "Writing patterns to replicate" },
  { value: "visual_reference", label: "Visual Reference", description: "Visual style to learn from" },
  { value: "content_idea", label: "Content Idea", description: "Narrative angle or creative direction" },
  { value: "negative_training", label: "Negative Training", description: "Patterns to eliminate from generation" },
];

const APPLIES_OPTIONS: { value: InjectionAppliesTo; label: string }[] = [
  { value: "all", label: "All generation" },
  { value: "caption", label: "Captions only" },
  { value: "image", label: "Images only" },
  { value: "poster", label: "Posters only" },
];

const SOURCE_MODES: { value: InjectionSourceType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", icon: <Type size={13} /> },
  { value: "image", label: "Image", icon: <Image size={13} /> },
  { value: "pdf", label: "PDF", icon: <FileText size={13} /> },
  { value: "url", label: "URL", icon: <Link size={13} /> },
];

const TYPE_COLORS: Record<InjectionType, string> = {
  caption_reference: "border-plasma/25 bg-plasma/[0.07] text-plasma/80",
  visual_reference: "border-peach/25 bg-peach/[0.07] text-peach/80",
  content_idea: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400/80",
  negative_training: "border-red-400/25 bg-red-400/[0.07] text-red-400/80",
};

const TYPE_LABELS: Record<InjectionType, string> = {
  caption_reference: "Caption",
  visual_reference: "Visual",
  content_idea: "Idea",
  negative_training: "Negative",
};

const SOURCE_LABELS: Record<InjectionSourceType, string> = {
  text: "Text",
  image: "Image",
  pdf: "PDF",
  url: "URL",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ExtractionResult = {
  extractedTags?: string[];
  extractedPreferences?: string[];
  extractedConstraints?: string[];
  extractedVisualTags?: string[];
  extractedToneTags?: string[];
  extractedCompositionTags?: string[];
  extractedAudienceSignals?: string[];
  extractedStrategicSignals?: string[];
  extractedText?: string;
  error?: string;
};

// ── Chip display ──────────────────────────────────────────────────────────────

function ChipGroup({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={clsx("rounded-full border px-2 py-0.5 text-[11px]", color)}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Injection card ────────────────────────────────────────────────────────────

function InjectionCard({
  injection,
  onToggle,
  onDelete,
}: {
  injection: TrainingInjection;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const allVisual = [
    ...injection.extractedVisualTags,
    ...injection.extractedCompositionTags,
  ];
  const allStrategic = [
    ...injection.extractedToneTags,
    ...injection.extractedStrategicSignals,
    ...injection.extractedAudienceSignals,
  ];
  const hasExpandContent =
    injection.sourceText ||
    injection.referenceUrl ||
    injection.extractedPreferences.length > 0 ||
    injection.extractedConstraints.length > 0 ||
    allVisual.length > 0 ||
    allStrategic.length > 0;

  return (
    <div
      className={clsx(
        "rounded-2xl border p-4 transition",
        injection.active ? "border-white/10 bg-white/[0.04]" : "border-white/5 bg-white/[0.02] opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", TYPE_COLORS[injection.type])}>
              {TYPE_LABELS[injection.type]}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              {injection.appliesTo}
            </span>
            {injection.sourceType !== "text" && (
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                {SOURCE_LABELS[injection.sourceType]}
              </span>
            )}
            {!injection.active && (
              <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">paused</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white leading-snug">{injection.label}</p>
          {injection.notes && (
            <p className="mt-0.5 text-xs text-white/45 leading-5">{injection.notes}</p>
          )}
          {injection.extractedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {injection.extractedTags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { onToggle(injection.id, !injection.active); }}
            className={clsx(
              "relative h-6 w-10 rounded-full border transition duration-200",
              injection.active ? "border-plasma/40 bg-plasma/20" : "border-white/15 bg-white/[0.07]"
            )}
            title={injection.active ? "Pause injection" : "Activate injection"}
          >
            <div className={clsx(
              "absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200",
              injection.active ? "left-5 bg-peach" : "left-0.5 bg-white/40"
            )} />
          </button>
          {hasExpandContent && (
            <button
              type="button"
              onClick={() => { setExpanded(!expanded); }}
              className="p-1 text-white/30 hover:text-white/60 transition"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => { onDelete(injection.id); }}
            className="p-1 text-white/30 hover:text-red-400/70 transition"
            title="Delete injection"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-3 border-t border-white/8 pt-4">
          {injection.referenceUrl && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Reference URL</p>
              <a href={injection.referenceUrl} target="_blank" rel="noreferrer" className="text-xs text-peach/60 underline decoration-plasma/30 break-all">
                {injection.referenceUrl}
              </a>
            </div>
          )}
          {injection.sourceText && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Source text</p>
              <p className="text-xs leading-5 text-white/45 line-clamp-5 whitespace-pre-wrap">{injection.sourceText}</p>
            </div>
          )}
          <ChipGroup label="Visual signals" items={allVisual} color="border-peach/15 bg-peach/[0.05] text-peach/65" />
          <ChipGroup label="Tone & strategy" items={allStrategic} color="border-white/12 bg-white/[0.05] text-white/55" />
          {injection.extractedPreferences.length > 0 && (
            <ChipGroup label="Reinforce" items={injection.extractedPreferences} color="border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/70" />
          )}
          {injection.extractedConstraints.length > 0 && (
            <ChipGroup label="Avoid" items={injection.extractedConstraints} color="border-red-400/20 bg-red-400/[0.06] text-red-400/70" />
          )}
          <p className="text-[10px] text-white/25">
            Added {new Date(injection.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Extracted preview ─────────────────────────────────────────────────────────

function ExtractionPreview({ result }: { result: ExtractionResult }) {
  return (
    <div className="rounded-xl border border-white/8 bg-charcoal/40 p-4 grid gap-3">
      {result.extractedTags && result.extractedTags.length > 0 && (
        <ChipGroup label="Signal tags" items={result.extractedTags} color="border-white/12 bg-white/[0.06] text-white/60" />
      )}
      {result.extractedVisualTags && result.extractedVisualTags.length > 0 && (
        <ChipGroup label="Visual" items={result.extractedVisualTags} color="border-peach/15 bg-peach/[0.05] text-peach/65" />
      )}
      {result.extractedCompositionTags && result.extractedCompositionTags.length > 0 && (
        <ChipGroup label="Composition" items={result.extractedCompositionTags} color="border-peach/12 bg-peach/[0.04] text-peach/55" />
      )}
      {result.extractedToneTags && result.extractedToneTags.length > 0 && (
        <ChipGroup label="Tone" items={result.extractedToneTags} color="border-white/12 bg-white/[0.05] text-white/55" />
      )}
      {result.extractedStrategicSignals && result.extractedStrategicSignals.length > 0 && (
        <ChipGroup label="Strategy" items={result.extractedStrategicSignals} color="border-white/10 bg-white/[0.04] text-white/50" />
      )}
      {result.extractedAudienceSignals && result.extractedAudienceSignals.length > 0 && (
        <ChipGroup label="Audience" items={result.extractedAudienceSignals} color="border-white/10 bg-white/[0.04] text-white/50" />
      )}
      {result.extractedPreferences && result.extractedPreferences.length > 0 && (
        <ChipGroup label="Reinforce" items={result.extractedPreferences} color="border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/70" />
      )}
      {result.extractedConstraints && result.extractedConstraints.length > 0 && (
        <ChipGroup label="Avoid" items={result.extractedConstraints} color="border-red-400/20 bg-red-400/[0.06] text-red-400/70" />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrainingInjectionsClient() {
  const [injections, setInjections] = useState<TrainingInjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  // Form state
  const [injectionType, setInjectionType] = useState<InjectionType>("caption_reference");
  const [sourceMode, setSourceMode] = useState<InjectionSourceType>("text");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [appliesTo, setAppliesTo] = useState<InjectionAppliesTo>("all");
  const [keepOriginal, setKeepOriginal] = useState(false);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction state
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/training/injections")
      .then((r) => r.json())
      .then((d: { injections?: TrainingInjection[] }) => setInjections(d.injections ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (panelOpen) setTimeout(() => labelRef.current?.focus(), 50);
  }, [panelOpen]);

  // Clean up object URL on unmount / file change
  useEffect(() => {
    return () => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); };
  }, [filePreviewUrl]);

  function resetForm() {
    setLabel("");
    setNotes("");
    setSourceText("");
    setReferenceUrl("");
    setInjectionType("caption_reference");
    setSourceMode("text");
    setAppliesTo("all");
    setKeepOriginal(false);
    setSelectedFile(null);
    if (filePreviewUrl) { URL.revokeObjectURL(filePreviewUrl); setFilePreviewUrl(null); }
    setExtracted(null);
    setSaveError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setExtracted(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    if (file && file.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  }

  function canExtract(): boolean {
    if (extracting) return false;
    if (sourceMode === "text") return !!(sourceText.trim() || notes.trim());
    if (sourceMode === "image" || sourceMode === "pdf") return !!selectedFile;
    if (sourceMode === "url") return !!referenceUrl.trim();
    return false;
  }

  async function handleExtract() {
    if (!canExtract()) return;
    setExtracting(true);
    setExtracted(null);

    try {
      let res: Response;

      if (sourceMode === "image" || sourceMode === "pdf") {
        const fd = new FormData();
        fd.append("file", selectedFile!);
        fd.append("type", injectionType);
        fd.append("label", label);
        fd.append("notes", notes);
        fd.append("keepOriginal", String(keepOriginal));
        res = await fetch("/api/training/analyze", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/training/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: injectionType, label, notes, sourceText, referenceUrl }),
        });
      }

      const data = (await res.json()) as ExtractionResult;
      // If the PDF was analyzed with keepOriginal, populate sourceText
      if (data.extractedText && !sourceText) setSourceText(data.extractedText);
      setExtracted(data);
    } catch {
      setExtracted({ error: "Extraction failed." });
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!label.trim()) { setSaveError("Label is required."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        type: injectionType,
        label,
        notes,
        sourceText: keepOriginal ? (sourceText || extracted?.extractedText || "") : sourceText,
        sourceType: sourceMode,
        referenceUrl: referenceUrl.trim() || undefined,
        appliesTo,
        extractedTags: extracted?.extractedTags ?? [],
        extractedPreferences: extracted?.extractedPreferences ?? [],
        extractedConstraints: extracted?.extractedConstraints ?? [],
        extractedVisualTags: extracted?.extractedVisualTags ?? [],
        extractedToneTags: extracted?.extractedToneTags ?? [],
        extractedCompositionTags: extracted?.extractedCompositionTags ?? [],
        extractedAudienceSignals: extracted?.extractedAudienceSignals ?? [],
        extractedStrategicSignals: extracted?.extractedStrategicSignals ?? [],
        active: true,
      };

      const res = await fetch("/api/training/injections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: { ok?: boolean; injection?: TrainingInjection; error?: string } = {};
      try { data = (await res.json()) as typeof data; } catch { /* non-JSON error body */ }

      if (!res.ok || !data.ok) {
        setSaveError(data.error ?? `Save failed (HTTP ${res.status}).`);
        return;
      }
      if (data.injection) setInjections((prev) => [data.injection!, ...prev]);
      resetForm();
      setPanelOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unexpected error — save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/training/injections/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = (await res.json()) as { ok?: boolean; injection?: TrainingInjection };
      if (data.ok && data.injection) {
        setInjections((prev) => prev.map((inj) => (inj.id === id ? data.injection! : inj)));
      }
    } catch {
      // toggle failure is non-critical; UI state stays until next reload
    }
  }

  async function handleDelete(id: string) {
    // Optimistic remove; restore on failure
    setInjections((prev) => prev.filter((inj) => inj.id !== id));
    try {
      const res = await fetch(`/api/training/injections/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        // Restore the deleted injection by re-fetching
        const r = await fetch("/api/training/injections");
        const d = (await r.json()) as { injections?: TrainingInjection[] };
        setInjections(d.injections ?? []);
      }
    } catch {
      const r = await fetch("/api/training/injections").catch(() => null);
      if (r?.ok) {
        const d = (await r.json()) as { injections?: TrainingInjection[] };
        setInjections(d.injections ?? []);
      }
    }
  }

  const activeCount = injections.filter((i) => i.active).length;

  // Accept strings for file input
  const fileAccept = sourceMode === "image" ? "image/jpeg,image/png,image/webp" : "application/pdf";

  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-peach/55">Training Injection</p>
          <h2 className="mt-1 font-display text-2xl text-white">Proactive Memory</h2>
        </div>
        {activeCount > 0 && (
          <span className="rounded-full border border-plasma/25 bg-plasma/[0.08] px-3 py-1 text-xs font-semibold text-peach/70">
            {activeCount} active
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-white/45 leading-6">
        Inject references — images, PDFs, captions, ideas — so ALPA can extract reusable creative intelligence. The original is discarded after extraction by default.
      </p>

      {/* Add button */}
      <button
        type="button"
        onClick={() => { setPanelOpen(!panelOpen); if (panelOpen) resetForm(); }}
        className={clsx(
          "mb-5 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
          panelOpen
            ? "border-white/20 bg-white/[0.08] text-white"
            : "border-white/12 bg-white/[0.05] text-white/65 hover:border-white/22 hover:text-white"
        )}
      >
        {panelOpen ? <X size={14} /> : <Plus size={14} />}
        {panelOpen ? "Cancel" : "Add injection"}
      </button>

      {/* Add panel */}
      {panelOpen && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 grid gap-4">

          {/* Injection type */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Injection type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInjectionType(opt.value)}
                  className={clsx(
                    "rounded-xl border px-3 py-2.5 text-left transition",
                    injectionType === opt.value ? "border-white/20 bg-white/[0.08]" : "border-white/8 bg-white/[0.03] hover:border-white/14"
                  )}
                >
                  <p className={clsx("text-xs font-semibold", injectionType === opt.value ? "text-white" : "text-white/55")}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-4 text-white/32">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Source mode */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Source</p>
            <div className="flex gap-2">
              {SOURCE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => { setSourceMode(mode.value); setExtracted(null); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    sourceMode === mode.value
                      ? "border-white/20 bg-white/[0.08] text-white"
                      : "border-white/8 bg-white/[0.03] text-white/40 hover:border-white/14 hover:text-white/60"
                  )}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Label</span>
              <input
                ref={labelRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Short descriptive title…"
                className="rounded-xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/28 focus:border-plasma/40"
              />
            </label>
          </div>

          {/* Source input — varies by mode */}
          {sourceMode === "text" && (
            <div>
              <label className="grid gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Source text</span>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste a caption, content angle, or reference text…"
                  className="min-h-[80px] resize-none rounded-xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm leading-6 text-white/80 outline-none placeholder:text-white/28 focus:border-plasma/40"
                />
              </label>
            </div>
          )}

          {(sourceMode === "image" || sourceMode === "pdf") && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {sourceMode === "image" ? "Upload image (jpg, png, webp — max 10MB)" : "Upload PDF (max 20MB)"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={fileAccept}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                  selectedFile
                    ? "border-white/20 bg-white/[0.06] text-white"
                    : "border-white/10 border-dashed bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white/65"
                )}
              >
                {sourceMode === "image" ? <Image size={14} /> : <FileText size={14} />}
                {selectedFile ? selectedFile.name : `Choose ${sourceMode === "image" ? "image" : "PDF"}…`}
              </button>
              {/* Image preview */}
              {filePreviewUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10" style={{ maxHeight: 160 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreviewUrl} alt="Preview" className="w-full object-cover" style={{ maxHeight: 160 }} />
                </div>
              )}
              {selectedFile && sourceMode === "pdf" && (
                <p className="mt-2 text-[11px] text-white/35">{(selectedFile.size / 1024).toFixed(0)} KB</p>
              )}
              {/* Keep original toggle — only meaningful for PDF */}
              {sourceMode === "pdf" && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setKeepOriginal(!keepOriginal)}
                    className={clsx(
                      "relative h-5 w-9 shrink-0 rounded-full border transition duration-200",
                      keepOriginal ? "border-plasma/35 bg-plasma/15" : "border-white/12 bg-white/[0.05]"
                    )}
                  >
                    <div className={clsx(
                      "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-200",
                      keepOriginal ? "left-4 bg-peach" : "left-0.5 bg-white/35"
                    )} />
                  </button>
                  <span className="text-[11px] text-white/40">Keep extracted text as source reference</span>
                </div>
              )}
            </div>
          )}

          {sourceMode === "url" && (
            <div>
              <label className="grid gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Reference URL
                  <span className="ml-2 normal-case font-normal text-white/25">image URLs analyzed via vision · other URLs stored as reference</span>
                </span>
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://…"
                  className="rounded-xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/28 focus:border-plasma/40"
                />
              </label>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Operator notes (optional)</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What should ALPA learn from this?"
                className="rounded-xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/28 focus:border-plasma/40"
              />
            </label>
          </div>

          {/* Applies to */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Applies to</p>
            <div className="flex flex-wrap gap-2">
              {APPLIES_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAppliesTo(opt.value)}
                  className={clsx(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    appliesTo === opt.value
                      ? "border-white/20 bg-white/[0.08] text-white"
                      : "border-white/8 bg-white/[0.03] text-white/40 hover:border-white/14 hover:text-white/60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extract button */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { void handleExtract(); }}
              disabled={!canExtract()}
              className="flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
            >
              {extracting ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              {extracting
                ? sourceMode === "image"
                  ? "Analyzing image…"
                  : sourceMode === "pdf"
                  ? "Extracting PDF…"
                  : "Extracting signals…"
                : "Extract signals with AI"}
            </button>

            {extracted?.error && (
              <p className="text-xs text-red-400/70">{extracted.error}</p>
            )}

            {extracted && !extracted.error && <ExtractionPreview result={extracted} />}
          </div>

          {saveError && <p className="text-xs text-red-400/70">{saveError}</p>}

          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={saving || !label.trim()}
            className="flex items-center justify-center gap-2 rounded-xl border border-plasma/35 bg-plasma/[0.10] py-2.5 text-sm font-semibold text-peach transition hover:border-plasma/55 hover:bg-plasma/[0.16] hover:text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : null}
            {saving ? "Saving…" : "Save injection"}
          </button>
        </div>
      )}

      {/* Injection list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-white/30" size={20} />
        </div>
      ) : injections.length === 0 ? (
        <p className="text-sm text-white/30">No training injections yet. Add one above to start shaping generation.</p>
      ) : (
        <div className="grid gap-3">
          {injections.map((inj) => (
            <InjectionCard
              key={inj.id}
              injection={inj}
              onToggle={(id, active) => { void handleToggle(id, active); }}
              onDelete={(id) => { void handleDelete(id); }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
