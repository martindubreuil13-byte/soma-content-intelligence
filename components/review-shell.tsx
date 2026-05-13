"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { cleanChannelContent } from "@/lib/content-formatting";
import type { TrainingSummary } from "@/lib/agent-training";
import type {
  ChannelFeedback,
  ChannelFeedbackGroup,
  ContentChannel,
  ContentRun,
  FeedbackStatus,
  FeedbackTarget
} from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";
import type { PublishingQueueItem } from "@/lib/autopilot-types";
import type { ApprovalTag, RejectionTag } from "@/lib/brand-intelligence";

const channels = Object.keys(channelLabels) as ContentChannel[];

const approvalTags: { id: ApprovalTag; label: string }[] = [
  { id: "strong_hook", label: "Strong hook" },
  { id: "emotionally_strong", label: "Emotionally strong" },
  { id: "operational_clarity", label: "Operational clarity" },
  { id: "good_visual", label: "Good visual" },
  { id: "platform_fit", label: "Platform fit" },
  { id: "strong_cta", label: "Strong CTA" },
  { id: "brand_aligned", label: "Brand aligned" }
];

const rejectionTags: { id: RejectionTag; label: string }[] = [
  { id: "generic", label: "Generic" },
  { id: "weak_hook", label: "Weak hook" },
  { id: "repetitive", label: "Repetitive" },
  { id: "poor_image", label: "Poor image" },
  { id: "unclear_message", label: "Unclear message" },
  { id: "too_corporate", label: "Too corporate" },
  { id: "weak_cta", label: "Weak CTA" },
  { id: "off_brand", label: "Off-brand" }
];

type ReviewShellProps = {
  run: ContentRun;
  runs: ContentRun[];
  trainingSummary: TrainingSummary;
  initialQueueMap: Record<ContentChannel, PublishingQueueItem | undefined>;
};

type TagPanelProps = {
  status: FeedbackStatus;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
};

function TagPanel({ status, selectedTags, onToggleTag }: TagPanelProps) {
  const tags = status === "approved" ? approvalTags : rejectionTags;
  if (status === "pending") return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onToggleTag(tag.id)}
          type="button"
          className={clsx(
            "rounded-full border px-2.5 py-1 text-xs font-semibold transition duration-150",
            selectedTags.includes(tag.id)
              ? status === "approved"
                ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                : "border-plasma/40 bg-plasma/[0.15] text-peach"
              : "border-white/10 bg-white/[0.05] text-white/45 hover:border-white/20 hover:text-white/70"
          )}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}

type FeedbackPanelProps = {
  title: string;
  notes: string;
  status: FeedbackStatus;
  versionLabel?: string;
  saved: boolean;
  saving: boolean;
  selectedTags: string[];
  onNotesChange: (notes: string) => void;
  onSave: (status: FeedbackStatus, tags: string[]) => void;
  onToggleTag: (tag: string) => void;
  placeholder: string;
};

function FeedbackPanel({
  title, notes, status, versionLabel, saved, saving, selectedTags,
  onNotesChange, onSave, onToggleTag, placeholder
}: FeedbackPanelProps) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg text-white">{title}</h3>
        {versionLabel ? <span className="text-xs font-semibold text-white/42">{versionLabel}</span> : null}
        <span
          className={clsx(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            status === "approved" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
            status === "rejected" && "border-plasma/30 bg-plasma/[0.10] text-peach",
            status === "pending" && "border-white/10 bg-white/[0.06] text-white/55"
          )}
        >
          {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"}
        </span>
        {saved ? <span className="text-xs font-semibold text-emerald-300">Saved</span> : null}
      </div>
      <TagPanel status={status} selectedTags={selectedTags} onToggleTag={onToggleTag} />
      <textarea
        className="mt-3 min-h-[64px] w-full resize-none rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm leading-6 text-white/78 outline-none transition placeholder:text-white/32 focus:border-plasma/45 focus:bg-white/[0.07]"
        disabled={saving}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={placeholder}
        value={notes}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={clsx(
            "flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40",
            status === "approved"
              ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-50"
              : "border-white/10 bg-white/[0.07] text-peach hover:border-emerald-300/35 hover:bg-emerald-300/10 hover:text-white"
          )}
          disabled={saving}
          onClick={() => onSave("approved", selectedTags)}
          type="button"
        >
          {saving ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
          Approve
        </button>
        <button
          className={clsx(
            "flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40",
            status === "rejected"
              ? "border-plasma/40 bg-plasma/[0.16] text-white"
              : "border-white/10 bg-white/[0.07] text-peach hover:border-plasma/40 hover:bg-plasma/[0.12] hover:text-white"
          )}
          disabled={saving}
          onClick={() => onSave("rejected", selectedTags)}
          type="button"
        >
          <X size={15} />
          Reject
        </button>
        <button
          className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-peach/70 transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={saving}
          onClick={() => onSave(status, selectedTags)}
          type="button"
        >
          Save notes
        </button>
      </div>
    </div>
  );
}

export function ReviewShell({ run, trainingSummary, initialQueueMap }: ReviewShellProps) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<ContentChannel>("linkedin");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [regeneratingCaption, setRegeneratingCaption] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [reimaginingVisual, setReimaginingVisual] = useState(false);
  const [visualTweaks, setVisualTweaks] = useState<Record<string, string>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});
  const [feedbackTags, setFeedbackTags] = useState<Record<string, string[]>>({});
  const [feedbackOverrides, setFeedbackOverrides] = useState<Record<string, ChannelFeedbackGroup>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [imageUrlOverrides, setImageUrlOverrides] = useState<Record<string, string>>({});
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [queueMap, setQueueMap] = useState(initialQueueMap);
  const [statusMessage, setStatusMessage] = useState("");

  const activePackage = run.channels[activeChannel];
  const channelKey = `${run.id}:${activeChannel}`;

  const feedback: ChannelFeedbackGroup = feedbackOverrides[channelKey] ?? activePackage.feedback;
  const displayCaption = useMemo(
    () => cleanChannelContent(activePackage.caption ?? "", activeChannel),
    [activeChannel, activePackage]
  );
  const displayVisualPrompt = activePackage.visualPrompt?.trim() ?? "";

  const currentCaptionVersion = activePackage.feedbackLineage.captionVersions.at(-1);
  const imageVersions = activePackage.feedbackLineage.imageVersions ?? [];
  const currentImageVersion = imageVersions.at(-1);
  const isCaptionApproved =
    currentCaptionVersion?.status === "approved" && feedback.caption.status === "approved";
  const currentImageMatchesCaption =
    isCaptionApproved && currentImageVersion?.parentCaptionVersionId === currentCaptionVersion?.id;
  const imageUrl = currentImageMatchesCaption
    ? imageUrlOverrides[channelKey] ?? activePackage.imageUrl ?? ""
    : "";
  const imageExists = currentImageMatchesCaption && Boolean(imageUrl);
  const downloadUrl = `/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/image?download=1`;
  const currentImageFeedback: ChannelFeedback = currentImageMatchesCaption
    ? feedback.image
    : { status: "pending", notes: "" };
  const historyImageVersions = currentImageMatchesCaption ? imageVersions.slice(0, -1) : imageVersions;

  const queueItem = queueMap[activeChannel];
  const isInQueue = Boolean(queueItem);
  const canAddToQueue = isCaptionApproved && imageExists && feedback.image.status === "approved";

  function getNotes(target: FeedbackTarget, versionId?: string) {
    const key = `${channelKey}:${target}:${versionId ?? "current"}`;
    const lineage = activePackage.feedbackLineage;
    const versions =
      target === "caption"
        ? lineage.captionVersions
        : target === "visualPrompt"
        ? lineage.visualPromptVersions
        : lineage.imageVersions;
    const versionNotes = versions.find((v) => v.id === versionId)?.notes;
    return feedbackNotes[key] ?? versionNotes ?? feedback[target].notes;
  }

  function getTags(target: FeedbackTarget, versionId?: string) {
    const key = `${channelKey}:${target}:${versionId ?? "current"}`;
    return feedbackTags[key] ?? [];
  }

  function setNotes(target: FeedbackTarget, notes: string, versionId?: string) {
    const key = `${channelKey}:${target}:${versionId ?? "current"}`;
    setFeedbackNotes((prev) => ({ ...prev, [key]: notes }));
  }

  function toggleTag(target: FeedbackTarget, tag: string, versionId?: string) {
    const key = `${channelKey}:${target}:${versionId ?? "current"}`;
    setFeedbackTags((prev) => {
      const current = prev[key] ?? [];
      return {
        ...prev,
        [key]: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
      };
    });
  }

  async function handleCopy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopiedTarget(label);
    setTimeout(() => setCopiedTarget(null), 1400);
  }

  async function handleSaveFeedback(
    target: FeedbackTarget,
    status: FeedbackStatus,
    tags: string[],
    versionId?: string
  ) {
    const resolvedVersionId =
      versionId ??
      (target === "caption"
        ? activePackage.currentCaptionVersionId
        : target === "visualPrompt"
        ? activePackage.currentVisualPromptVersionId
        : activePackage.currentImageVersionId);

    const key = `${channelKey}:${target}:${resolvedVersionId ?? "current"}`;
    const notes = getNotes(target, resolvedVersionId);

    setSavingKey(key);
    setSavedKey(null);

    try {
      const response = await fetch(
        `/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, status, notes, versionId: resolvedVersionId, tags })
        }
      );
      const result = (await response.json()) as { ok?: boolean; feedback?: ChannelFeedback; error?: string };

      if (!response.ok || !result.ok || !result.feedback) {
        throw new Error(result.error ?? "Feedback save failed.");
      }

      const currentVersionId =
        target === "caption"
          ? activePackage.currentCaptionVersionId
          : target === "visualPrompt"
          ? activePackage.currentVisualPromptVersionId
          : activePackage.currentImageVersionId;

      if (!resolvedVersionId || resolvedVersionId === currentVersionId) {
        setFeedbackOverrides((prev) => ({
          ...prev,
          [channelKey]: {
            ...(prev[channelKey] ?? feedback),
            [target]: result.feedback!
          }
        }));
      }

      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1800);
      router.refresh();
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRegenerateCaption() {
    if (regeneratingCaption || generatingImage || reimaginingVisual) return;
    setRegeneratingCaption(true);
    setStatusMessage("Regenerating caption from your feedback…");

    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/caption`, {
        method: "POST"
      });
      const result = (await response.json()) as { ok?: boolean; caption?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Regeneration failed.");
      setFeedbackOverrides((prev) => ({
        ...prev,
        [channelKey]: {
          ...(prev[channelKey] ?? feedback),
          caption: { status: "pending", notes: "" },
          image: { status: "pending", notes: "" }
        }
      }));
      setStatusMessage("Caption regenerated.");
      router.refresh();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setRegeneratingCaption(false);
    }
  }

  async function handleGenerateImage() {
    if (generatingImage || reimaginingVisual) return;
    setGeneratingImage(true);
    setImageErrors((prev) => { const n = { ...prev }; delete n[channelKey]; return n; });
    setStatusMessage("Generating image…");

    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualTweak: visualTweaks[channelKey] ?? "" })
      });
      const result = (await response.json()) as { ok?: boolean; imageUrl?: string; error?: string };
      if (!response.ok || !result.ok || !result.imageUrl) throw new Error(result.error ?? "Image generation failed.");
      setImageUrlOverrides((prev) => ({ ...prev, [channelKey]: result.imageUrl! }));
      setStatusMessage("Image generated.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed.";
      setImageErrors((prev) => ({ ...prev, [channelKey]: msg }));
      setStatusMessage(msg);
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleReimagineVisual() {
    if (generatingImage || reimaginingVisual) return;
    setReimaginingVisual(true);
    setImageErrors((prev) => { const n = { ...prev }; delete n[channelKey]; return n; });
    setStatusMessage("Reimagining visual concept…");

    try {
      const response = await fetch(
        `/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/reimagine-visual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visualTweak: visualTweaks[channelKey] ?? "" })
        }
      );
      const result = (await response.json()) as { ok?: boolean; imageUrl?: string; visualPrompt?: string; error?: string };
      if (!response.ok || !result.ok || !result.imageUrl) throw new Error(result.error ?? "Reimagine failed.");
      setImageUrlOverrides((prev) => ({ ...prev, [channelKey]: result.imageUrl! }));
      setStatusMessage("Visual concept reimagined.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reimagine failed.";
      setImageErrors((prev) => ({ ...prev, [channelKey]: msg }));
      setStatusMessage(msg);
    } finally {
      setReimaginingVisual(false);
    }
  }

  async function handleAddToQueue() {
    if (addingToQueue || !canAddToQueue) return;
    setAddingToQueue(true);

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          channel: activeChannel,
          captionVersionId: activePackage.currentCaptionVersionId ?? "",
          imageVersionId: activePackage.currentImageVersionId,
          captionExcerpt: displayCaption.slice(0, 200),
          imagePath: activePackage.imageUrl
        })
      });
      const result = (await response.json()) as { ok?: boolean; item?: PublishingQueueItem; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Failed.");
      setQueueMap((prev) => ({ ...prev, [activeChannel]: result.item }));
      setStatusMessage("Added to publishing queue.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to add to queue.");
    } finally {
      setAddingToQueue(false);
    }
  }

  const isBusy = regeneratingCaption || generatingImage || reimaginingVisual;

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-peach/55">Review Desk</p>
        <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">{run.timestamp}</h1>
        {run.hasOriginalIdea ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{run.originalIdea}</p>
        ) : null}

        {/* Training badge */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-plasma via-peach to-ember"
              style={{ width: `${trainingSummary.score}%` }}
            />
          </div>
          <span className="text-xs text-white/45">
            {trainingSummary.stage} · {trainingSummary.score}/100
          </span>
        </div>
      </div>

      {/* Status message */}
      {statusMessage ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/70">
          {statusMessage}
        </div>
      ) : null}

      {/* Channel tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-charcoal/60 p-1">
        {channels.map((ch) => {
          const pkg = run.channels[ch];
          const captionOk = pkg.feedback.caption.status === "approved";
          const imageOk = pkg.feedback.image.status === "approved";

          return (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              type="button"
              className={clsx(
                "relative shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200",
                activeChannel === ch
                  ? "bg-white text-charcoal shadow"
                  : "text-white/55 hover:bg-white/10 hover:text-white"
              )}
            >
              {channelLabels[ch]}
              {captionOk && imageOk ? (
                <CheckCircle2
                  size={10}
                  className="absolute -right-0.5 -top-0.5 text-emerald-400"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="grid gap-4">
        {/* Caption section */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-ink/80">
          <div className="warm-line absolute left-0 right-0 top-0 h-px" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <h2 className="font-display text-2xl text-white">Caption</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2 text-sm font-semibold text-peach transition hover:border-plasma/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
                disabled={!displayCaption}
                onClick={() => handleCopy(displayCaption, "caption")}
                type="button"
              >
                {copiedTarget === "caption" ? <Check size={15} /> : <Clipboard size={15} />}
                {copiedTarget === "caption" ? "Copied" : "Copy"}
              </button>
              <button
                className="flex items-center gap-2 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3.5 py-2 text-sm font-semibold text-peach transition hover:border-plasma/50 hover:bg-plasma/[0.13] hover:text-white disabled:opacity-40"
                disabled={!displayCaption || isBusy}
                onClick={handleRegenerateCaption}
                type="button"
              >
                {regeneratingCaption ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
                {regeneratingCaption ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>

          <div className="max-h-[40vh] min-h-[200px] overflow-y-auto px-5 py-6 [scrollbar-color:rgba(255,192,151,0.4)_transparent] sm:px-7">
            {displayCaption ? (
              <ReactMarkdown
                remarkPlugins={[remarkBreaks]}
                components={{
                  h1: ({ children }) => <h1 className="mb-4 font-display text-3xl text-white">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-3 mt-6 font-display text-2xl text-white">{children}</h2>,
                  p: ({ children }) => <p className="mb-4 text-base leading-8 text-white/82">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                  em: ({ children }) => <em className="text-peach not-italic">{children}</em>,
                  ul: ({ children }) => <ul className="mb-5 grid gap-3 pl-5 text-white/82">{children}</ul>,
                  li: ({ children }) => <li className="list-disc leading-7 marker:text-plasma/70">{children}</li>,
                  a: ({ children, href }) => <a className="text-peach underline decoration-plasma/50 underline-offset-4" href={href}>{children}</a>
                }}
              >
                {displayCaption}
              </ReactMarkdown>
            ) : (
              <p className="text-sm leading-7 text-white/45">No caption available for this channel.</p>
            )}
          </div>

          <div className="border-t border-white/10 p-4 sm:p-5">
            <FeedbackPanel
              title="Caption Evaluation"
              notes={getNotes("caption", currentCaptionVersion?.id)}
              status={feedback.caption.status}
              versionLabel={currentCaptionVersion?.id ?? "initial"}
              saved={savedKey === `${channelKey}:caption:${currentCaptionVersion?.id ?? "current"}`}
              saving={savingKey === `${channelKey}:caption:${currentCaptionVersion?.id ?? "current"}`}
              selectedTags={getTags("caption", currentCaptionVersion?.id)}
              onNotesChange={(n) => setNotes("caption", n, currentCaptionVersion?.id)}
              onSave={(status, tags) => handleSaveFeedback("caption", status, tags, currentCaptionVersion?.id)}
              onToggleTag={(tag) => toggleTag("caption", tag, currentCaptionVersion?.id)}
              placeholder={"Stronger hook\nLess generic\nBetter CTA rhythm\nGood direction — keep this tone"}
            />
          </div>
        </section>

        {/* Image direction + generation */}
        {isCaptionApproved ? (
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-charcoal/90">
            <div className="warm-line absolute left-0 right-0 top-0 h-px" />
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-2xl text-white">Image Direction</h2>
              <div className="flex flex-col gap-2 sm:min-w-[300px]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-peach/55">Direction tweak</span>
                  <textarea
                    className="min-h-[52px] resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm leading-5 text-white/78 outline-none transition placeholder:text-white/32 focus:border-plasma/40"
                    disabled={isBusy}
                    onChange={(e) => setVisualTweaks((prev) => ({ ...prev, [channelKey]: e.target.value }))}
                    placeholder="more documentary&#10;darker mood"
                    value={visualTweaks[channelKey] ?? ""}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="flex items-center gap-2 rounded-2xl border border-ember/25 bg-ember/[0.09] px-3.5 py-2 text-sm font-semibold text-peach transition hover:border-ember/50 hover:bg-ember/[0.14] hover:text-white disabled:opacity-40"
                    disabled={!displayVisualPrompt || isBusy}
                    onClick={handleGenerateImage}
                    type="button"
                  >
                    {generatingImage ? <Loader2 className="animate-spin" size={15} /> : <ImagePlus size={15} />}
                    {generatingImage ? "Generating…" : imageExists ? "Regenerate Image" : "Generate Image"}
                  </button>
                  <button
                    className="flex items-center gap-2 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3.5 py-2 text-sm font-semibold text-peach transition hover:border-plasma/50 hover:bg-plasma/[0.13] hover:text-white disabled:opacity-40"
                    disabled={!displayCaption || isBusy}
                    onClick={handleReimagineVisual}
                    type="button"
                  >
                    {reimaginingVisual ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                    {reimaginingVisual ? "Reimagining…" : "Reimagine Visual"}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/50">
                {displayVisualPrompt
                  ? "Internal visual brief ready. Generate to create the image."
                  : "No visual brief found for this channel."}
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-charcoal/60 px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-peach/55">Image locked</p>
            <h2 className="mt-2 font-display text-2xl text-white">Approve the caption first</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Image generation is only available once the current caption version is approved.
            </p>
          </section>
        )}

        {/* Generated image */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-ink/75">
          <div className="warm-line absolute left-0 right-0 top-0 h-px" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <h2 className="font-display text-2xl text-white">Generated Image</h2>
            {imageExists ? (
              <a
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2 text-sm font-semibold text-peach transition hover:border-plasma/40 hover:bg-white/[0.12] hover:text-white"
                download={`alpa-${activeChannel}-${run.id}.png`}
                href={downloadUrl}
              >
                <Download size={15} />
                Download
              </a>
            ) : null}
          </div>
          <div className="min-h-[180px] px-5 py-5">
            {!isCaptionApproved ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-charcoal/40 text-center">
                <p className="text-sm text-white/45">Approve the caption before evaluating images.</p>
              </div>
            ) : generatingImage || reimaginingVisual ? (
              <div className="rounded-[22px] border border-white/10 bg-charcoal/50 p-5">
                <div className="flex items-center gap-3 text-peach">
                  <Loader2 className="animate-spin" size={18} />
                  <p className="text-sm font-semibold">
                    {reimaginingVisual ? "Reimagining visual concept…" : "Generating image… this takes a moment."}
                  </p>
                </div>
                <div className="mt-4 aspect-[4/3] w-full animate-pulse rounded-[18px] border border-white/8 bg-gradient-to-br from-white/[0.07] via-plasma/[0.07] to-ember/[0.07]" />
              </div>
            ) : imageExists ? (
              <div className="grid gap-4">
                {imageErrors[channelKey] ? (
                  <p className="rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-4 py-3 text-sm text-peach">
                    {imageErrors[channelKey]}
                  </p>
                ) : null}
                <img
                  alt={`${channelLabels[activeChannel]} generated visual`}
                  className="max-h-[56vh] w-full rounded-[22px] border border-white/10 object-contain shadow-glow"
                  src={imageUrl}
                />
                <FeedbackPanel
                  title="Image Evaluation"
                  notes={getNotes("image", currentImageVersion?.id)}
                  status={currentImageFeedback.status}
                  versionLabel={currentImageVersion?.id ?? "current image"}
                  saved={savedKey === `${channelKey}:image:${currentImageVersion?.id ?? "current"}`}
                  saving={savingKey === `${channelKey}:image:${currentImageVersion?.id ?? "current"}`}
                  selectedTags={getTags("image", currentImageVersion?.id)}
                  onNotesChange={(n) => setNotes("image", n, currentImageVersion?.id)}
                  onSave={(status, tags) => handleSaveFeedback("image", status, tags, currentImageVersion?.id)}
                  onToggleTag={(tag) => toggleTag("image", tag, currentImageVersion?.id)}
                  placeholder={"Too polished\nMore documentary\nLess dashboard\nGood direction — keep this style"}
                />
                {historyImageVersions.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-peach/50">
                      Image History
                    </p>
                    <div className="grid gap-3">
                      {historyImageVersions
                        .slice()
                        .reverse()
                        .map((v) => (
                          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3" key={v.id}>
                            {v.imagePath ? (
                              <img
                                alt={v.id}
                                className="mb-3 max-h-64 w-full rounded-2xl border border-white/10 object-contain"
                                src={`/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/image?file=${encodeURIComponent(v.imagePath.split("/").at(-1) ?? "")}`}
                              />
                            ) : null}
                            <FeedbackPanel
                              title="Image Evaluation"
                              notes={getNotes("image", v.id)}
                              status={v.status}
                              versionLabel={v.id}
                              saved={savedKey === `${channelKey}:image:${v.id}`}
                              saving={savingKey === `${channelKey}:image:${v.id}`}
                              selectedTags={getTags("image", v.id)}
                              onNotesChange={(n) => setNotes("image", n, v.id)}
                              onSave={(status, tags) => handleSaveFeedback("image", status, tags, v.id)}
                              onToggleTag={(tag) => toggleTag("image", tag, v.id)}
                              placeholder="What worked or missed for this exact image?"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[160px] items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-charcoal/40 text-center">
                <p className="max-w-sm text-sm text-white/45">
                  {isCaptionApproved
                    ? "Generate an image from this channel's visual brief."
                    : "Approve the caption first to unlock image generation."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-[56px] z-20 border-t border-white/[0.08] bg-charcoal/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex gap-2">
          <button
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition",
              feedback.caption.status === "approved"
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : "border-white/12 bg-white/[0.06] text-white/70"
            )}
            onClick={() =>
              handleSaveFeedback(
                "caption",
                feedback.caption.status === "approved" ? "pending" : "approved",
                getTags("caption", currentCaptionVersion?.id),
                currentCaptionVersion?.id
              )
            }
            type="button"
          >
            <Check size={15} />
            Caption
          </button>
          <button
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition",
              feedback.caption.status === "rejected"
                ? "border-plasma/30 bg-plasma/[0.12] text-peach"
                : "border-white/12 bg-white/[0.06] text-white/70"
            )}
            onClick={() =>
              handleSaveFeedback(
                "caption",
                "rejected",
                getTags("caption", currentCaptionVersion?.id),
                currentCaptionVersion?.id
              )
            }
            type="button"
          >
            <X size={15} />
            Reject
          </button>
          {canAddToQueue ? (
            <button
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition",
                isInQueue
                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                  : "border-plasma/30 bg-plasma/[0.10] text-peach"
              )}
              disabled={addingToQueue || isInQueue}
              onClick={handleAddToQueue}
              type="button"
            >
              {addingToQueue ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
              {isInQueue ? "In Queue" : "Queue"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Desktop queue button */}
      {canAddToQueue ? (
        <div className="mt-6 hidden lg:block">
          <button
            className={clsx(
              "flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition",
              isInQueue
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : "border-plasma/30 bg-plasma/[0.10] px-5 py-3 text-peach hover:border-plasma/50 hover:bg-plasma/[0.16] hover:text-white"
            )}
            disabled={addingToQueue || isInQueue}
            onClick={handleAddToQueue}
            type="button"
          >
            {addingToQueue ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            {isInQueue ? "Added to Publishing Queue" : "Add to Publishing Queue"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
