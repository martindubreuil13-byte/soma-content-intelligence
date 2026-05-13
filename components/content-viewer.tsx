"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { Check, Clipboard, Download, ImagePlus, Loader2, RotateCcw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { cleanChannelContent } from "@/lib/content-formatting";
import {
  ChannelFeedbackGroup,
  channelLabels,
  ContentChannel,
  ContentRun,
  FeedbackStatus,
  FeedbackTarget
} from "@/lib/content-types";

const channels = Object.keys(channelLabels) as ContentChannel[];

type ContentViewerProps = {
  activeChannel: ContentChannel;
  copiedTarget: "caption" | "visualPrompt" | "action" | null;
  imageError?: string;
  imageExistsOverride?: boolean;
  imageUrlOverride?: string;
  captionOverride?: string;
  feedback: ChannelFeedbackGroup;
  getFeedbackNotes: (target: FeedbackTarget, versionId?: string) => string;
  savedFeedbackKey: string | null;
  isGeneratingImage: boolean;
  isReimaginingVisual: boolean;
  isRegeneratingCaption: boolean;
  savingFeedbackKey: string | null;
  run?: ContentRun;
  visualTweak: string;
  visualPromptOverride?: string;
  onActiveChannelChange: (channel: ContentChannel) => void;
  onFeedbackNotesChange: (target: FeedbackTarget, notes: string, versionId?: string) => void;
  onSaveFeedback: (target: FeedbackTarget, status: FeedbackStatus, versionId?: string) => void;
  onVisualTweakChange: (tweak: string) => void;
  onCopyText: (text: string, target: "caption" | "visualPrompt") => void;
  onGenerateImage: () => void;
  onRegenerateCaption: () => void;
  onReimagineVisual: () => void;
  onUseIdeaAgain: (idea: string) => void;
};

type FeedbackPanelProps = {
  notes: string;
  onNotesChange: (notes: string) => void;
  onSave: (status: FeedbackStatus) => void;
  placeholder: string;
  saved: boolean;
  saving: boolean;
  status: FeedbackStatus;
  title: string;
  versionLabel?: string;
};

function FeedbackPanel({ notes, onNotesChange, onSave, placeholder, saved, saving, status, title, versionLabel }: FeedbackPanelProps) {
  const badgeLabel = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg text-white">{title}</h3>
        {versionLabel ? <span className="text-xs font-semibold text-white/42">{versionLabel}</span> : null}
        <span
          className={clsx(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            status === "approved" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
            status === "rejected" && "border-plasma/30 bg-plasma/[0.10] text-peach",
            status === "pending" && "border-white/10 bg-white/[0.06] text-white/55"
          )}
        >
          {badgeLabel}
        </span>
        {saved ? <span className="text-xs font-semibold text-peach">Saved</span> : null}
      </div>
      <textarea
        className="mt-3 min-h-[76px] w-full resize-none rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm leading-6 text-white/78 outline-none transition placeholder:text-white/32 focus:border-plasma/45 focus:bg-white/[0.07]"
        disabled={saving}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder={placeholder}
        value={notes}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={clsx(
            "flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
            status === "approved"
              ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-50"
              : "border-white/10 bg-white/[0.07] text-peach hover:border-emerald-300/35 hover:bg-emerald-300/10 hover:text-white"
          )}
          disabled={saving}
          onClick={() => onSave("approved")}
          type="button"
        >
          {saving ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
          Approve
        </button>
        <button
          className={clsx(
            "flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
            status === "rejected"
              ? "border-plasma/40 bg-plasma/[0.16] text-white"
              : "border-white/10 bg-white/[0.07] text-peach hover:border-plasma/40 hover:bg-plasma/[0.12] hover:text-white"
          )}
          disabled={saving}
          onClick={() => onSave("rejected")}
          type="button"
        >
          Reject
        </button>
        <button
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/35 hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          disabled={saving}
          onClick={() => onSave(status)}
          type="button"
        >
          Save notes
        </button>
      </div>
    </div>
  );
}

export function ContentViewer({
  activeChannel,
  copiedTarget,
  imageError,
  imageExistsOverride,
  imageUrlOverride,
  captionOverride,
  feedback,
  getFeedbackNotes,
  savedFeedbackKey,
  isGeneratingImage,
  isReimaginingVisual,
  isRegeneratingCaption,
  savingFeedbackKey,
  run,
  visualTweak,
  visualPromptOverride,
  onActiveChannelChange,
  onFeedbackNotesChange,
  onSaveFeedback,
  onVisualTweakChange,
  onCopyText,
  onGenerateImage,
  onRegenerateCaption,
  onReimagineVisual,
  onUseIdeaAgain
}: ContentViewerProps) {
  const activePackage = useMemo(() => run?.channels[activeChannel], [activeChannel, run]);
  const displayCaption = useMemo(
    () => cleanChannelContent(captionOverride ?? activePackage?.caption ?? "", activeChannel),
    [activeChannel, activePackage, captionOverride]
  );
  const displayVisualPrompt = visualPromptOverride ?? activePackage?.visualPrompt?.trim() ?? "";
  const downloadUrl = run ? `/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/image?download=1` : "";
  const isImageActionBusy = isGeneratingImage || isReimaginingVisual;
  const currentCaptionVersion = activePackage?.feedbackLineage.captionVersions.at(-1);
  const imageVersions = activePackage?.feedbackLineage.imageVersions ?? [];
  const currentImageVersion = imageVersions.at(-1);
  const isCaptionApproved = currentCaptionVersion?.status === "approved" && feedback.caption.status === "approved";
  const currentImageMatchesCaption = isCaptionApproved && currentImageVersion?.parentCaptionVersionId === currentCaptionVersion.id;
  const imageUrl = currentImageMatchesCaption ? imageUrlOverride ?? activePackage?.imageUrl ?? "" : "";
  const imageExists = currentImageMatchesCaption && (imageExistsOverride ?? Boolean(imageUrl));
  const imageActionLabel = imageExists ? "Regenerate Image" : "Generate Image";
  const imageLoadingLabel = imageExists ? "Regenerating..." : "Generating";
  const currentImageFeedback = currentImageMatchesCaption ? feedback.image : { status: "pending" as FeedbackStatus, notes: "" };
  const historyImageVersions = currentImageMatchesCaption ? imageVersions.slice(0, -1) : imageVersions;
  const imageLoadingMessage = isReimaginingVisual
    ? "Reimagining the visual concept..."
    : imageExists
    ? "Regenerating image... this can take a little while."
    : "Generating image... this can take a little while.";

  if (!run) {
    return (
      <main className="glass-panel flex min-h-[520px] items-center justify-center rounded-[32px] p-6 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-plasma/80">No runs found</p>
          <h1 className="mt-3 font-display text-4xl text-white">Waiting for local output</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/58">
            Run the Python agent and this cockpit will pick up timestamped folders from `outputs/`.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="glass-panel min-h-[520px] rounded-[32px] p-4 sm:p-6 lg:p-7">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-plasma/80">Selected run</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-white sm:text-4xl">{run.title}</h1>
          <p className="mt-2 text-sm text-peach/70">{run.mood}</p>
        </div>
        <div className="rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-xs font-medium text-peach">
          {run.timestamp}
        </div>
      </div>

      <section className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.26em] text-ember/75">Original idea</p>
            <p className="mt-2 text-sm leading-6 text-white/70">{run.originalIdea}</p>
          </div>
          <button
            className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/50 hover:bg-plasma/[0.13] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            disabled={!run.hasOriginalIdea}
            onClick={() => onUseIdeaAgain(run.originalIdea)}
            type="button"
          >
            <RotateCcw size={15} />
            Use this idea again
          </button>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-charcoal/50 p-1">
          {channels.map((channel) => (
            <button
              className={clsx(
                "shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-300",
                activeChannel === channel
                  ? "bg-white text-charcoal shadow-glow"
                  : "text-white/62 hover:bg-white/10 hover:text-white"
              )}
              key={channel}
              onClick={() => onActiveChannelChange(channel)}
              type="button"
            >
              {channelLabels[channel]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-ink/80">
          <div className="warm-line absolute left-0 right-0 top-0 h-px" />
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 className="font-display text-2xl text-white">Caption</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/40 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                disabled={!displayCaption}
                onClick={() => onCopyText(displayCaption, "caption")}
                type="button"
              >
                {copiedTarget === "caption" ? <Check size={16} /> : <Clipboard size={16} />}
                {copiedTarget === "caption" ? "Copied" : "Copy"}
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/50 hover:bg-plasma/[0.13] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                disabled={!displayCaption || isRegeneratingCaption}
                onClick={onRegenerateCaption}
                type="button"
              >
                {isRegeneratingCaption ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                {isRegeneratingCaption ? "Regenerating..." : "Regenerate Caption"}
              </button>
            </div>
          </div>
          <div className="max-h-[42vh] min-h-[260px] overflow-y-auto px-5 py-6 [scrollbar-color:rgba(255,192,151,0.45)_transparent] sm:px-7">
            {displayCaption ? (
            <ReactMarkdown
              remarkPlugins={[remarkBreaks]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-5 font-display text-3xl leading-tight text-white">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-4 mt-8 font-display text-2xl leading-tight text-white">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-3 mt-7 font-display text-xl leading-tight text-peach">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-5 text-base leading-8 text-white/82 sm:text-lg">
                    {children}
                  </p>
                ),
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }) => <em className="text-peach not-italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="mb-6 grid gap-3 pl-5 text-white/82">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => <ol className="mb-6 grid gap-3 pl-5 text-white/82">{children}</ol>,
                li: ({ children }) => <li className="list-disc leading-7 marker:text-plasma/70">{children}</li>,
                a: ({ children, href }) => (
                  <a className="text-peach underline decoration-plasma/50 underline-offset-4" href={href}>
                    {children}
                  </a>
                )
              }}
            >
              {displayCaption}
            </ReactMarkdown>
          ) : (
            <p className="text-base leading-8 text-white/58 sm:text-lg">
              This caption is empty or has not been generated for this run.
            </p>
          )}
          </div>
          <div className="border-t border-white/10 p-4 sm:p-5">
            <FeedbackPanel
              notes={getFeedbackNotes("caption", currentCaptionVersion?.id)}
              onNotesChange={(notes) => onFeedbackNotesChange("caption", notes, currentCaptionVersion?.id)}
              onSave={(status) => onSaveFeedback("caption", status, currentCaptionVersion?.id)}
              placeholder={"Stronger hook\nLess generic\nBetter CTA rhythm\nGood direction, keep this tone"}
              saved={savedFeedbackKey === `caption:${currentCaptionVersion?.id ?? "current"}`}
              saving={savingFeedbackKey === `caption:${currentCaptionVersion?.id ?? "current"}`}
              status={feedback.caption.status}
              title="Caption Evaluation"
              versionLabel={currentCaptionVersion?.id ?? "current version"}
            />
          </div>
        </section>

        {isCaptionApproved ? (
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-charcoal/90">
          <div className="warm-line absolute left-0 right-0 top-0 h-px" />
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="font-display text-2xl text-white">Image Direction</h2>
            <div className="flex flex-col gap-2 sm:min-w-[320px] sm:max-w-md">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-peach/60">
                  Direction Tweaks
                </span>
                <textarea
                  className="min-h-[58px] resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-sm leading-5 text-white/78 outline-none transition placeholder:text-white/32 focus:border-plasma/45 focus:bg-white/[0.07]"
                  disabled={isImageActionBusy}
                  onChange={(event) => onVisualTweakChange(event.target.value)}
                  placeholder="more documentary&#10;airport instead of office&#10;darker mood"
                  value={visualTweak}
                />
              </label>
              <div className="flex flex-wrap gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border border-ember/25 bg-ember/[0.09] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-ember/50 hover:bg-ember/[0.14] hover:text-white"
                disabled={!displayVisualPrompt || isImageActionBusy || !isCaptionApproved}
                onClick={onGenerateImage}
                type="button"
              >
                {isGeneratingImage ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
                {isGeneratingImage ? imageLoadingLabel : imageActionLabel}
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/50 hover:bg-plasma/[0.13] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                disabled={!displayCaption || isImageActionBusy || !isCaptionApproved}
                onClick={onReimagineVisual}
                type="button"
              >
                {isReimaginingVisual ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {isReimaginingVisual ? "Reimagining..." : "Reimagine Visual"}
              </button>
              </div>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-7">
            {displayVisualPrompt ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/58">
                Internal visual brief ready for image generation.
              </p>
            ) : (
              <p className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/52">
                No internal visual brief found for this channel.
              </p>
            )}
          </div>
        </section>
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-charcoal/70 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-peach/60">Image locked</p>
            <h2 className="mt-2 font-display text-2xl text-white">Approve the caption first</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Images are generated only after the current caption version is approved, so the visual work stays tied to the right message.
            </p>
          </section>
        )}

        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-ink/75">
          <div className="warm-line absolute left-0 right-0 top-0 h-px" />
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="font-display text-2xl text-white">Generated Image</h2>
            {imageExists ? (
              <a
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2 text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/40 hover:bg-white/[0.12] hover:text-white"
                download={`alpa-${activeChannel}-${run.id}.png`}
                href={downloadUrl}
              >
                <Download size={16} />
                Download Image
              </a>
            ) : (
              <button
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-peach/50 opacity-60"
                disabled
                type="button"
              >
                <Download size={16} />
                Download Image
              </button>
            )}
          </div>
          <div className="min-h-[220px] px-5 py-6 sm:px-7">
            {!isCaptionApproved ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-charcoal/45 px-5 text-center">
                <p className="max-w-md text-sm leading-6 text-white/52">
                  Approve the caption before generating or evaluating images for this channel.
                </p>
              </div>
            ) : isReimaginingVisual && imageUrl ? (
              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-4 py-3 text-peach">
                  <Loader2 className="animate-spin" size={18} />
                  <p className="text-sm font-semibold">{imageLoadingMessage}</p>
                </div>
                <img
                  alt={`${channelLabels[activeChannel]} generated visual`}
                  className="max-h-[58vh] w-full rounded-[22px] border border-white/10 object-contain opacity-75 shadow-glow"
                  src={imageUrl}
                />
              </div>
            ) : isGeneratingImage || (isReimaginingVisual && !imageUrl) ? (
              <div className="rounded-[22px] border border-white/10 bg-charcoal/50 p-5">
                <div className="flex items-center gap-3 text-peach">
                  <Loader2 className="animate-spin" size={18} />
                  <p className="text-sm font-semibold">{imageLoadingMessage}</p>
                </div>
                <div className="mt-5 aspect-[4/3] w-full animate-pulse rounded-[18px] border border-white/8 bg-gradient-to-br from-white/[0.08] via-plasma/[0.08] to-ember/[0.08]" />
              </div>
            ) : (
              <>
                {imageError ? (
                  <div className="mb-4 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-4 py-3 text-sm leading-6 text-peach">
                    {imageError}
                  </div>
                ) : null}
                {imageUrl ? (
                  <div className="grid gap-4">
                    <img
                      alt={`${channelLabels[activeChannel]} generated visual`}
                      className="max-h-[58vh] w-full rounded-[22px] border border-white/10 object-contain shadow-glow"
                      src={imageUrl}
                    />
                    <FeedbackPanel
                      notes={getFeedbackNotes("image", currentImageVersion?.id)}
                      onNotesChange={(notes) => onFeedbackNotesChange("image", notes, currentImageVersion?.id)}
                      onSave={(status) => onSaveFeedback("image", status, currentImageVersion?.id)}
                      placeholder={"Too polished\nMore documentary\nLess dashboard\nMore lifestyle\nGood direction, keep this style"}
                      saved={savedFeedbackKey === `image:${currentImageVersion?.id ?? "current"}`}
                      saving={savingFeedbackKey === `image:${currentImageVersion?.id ?? "current"}`}
                      status={currentImageFeedback.status}
                      title="Image Evaluation"
                      versionLabel={currentImageVersion?.id ?? "current image"}
                    />
                    {historyImageVersions.length ? (
                      <div className="grid gap-3 border-t border-white/10 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-peach/55">Image History</p>
                        {historyImageVersions
                          .slice()
                          .reverse()
                          .map((version) => (
                            <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-3" key={version.id}>
                              {version.imagePath ? (
                                <img
                                  alt={`${channelLabels[activeChannel]} ${version.id}`}
                                  className="mb-3 max-h-72 w-full rounded-2xl border border-white/10 object-contain"
                                  src={`/api/runs/${encodeURIComponent(run.id)}/${activeChannel}/image?file=${encodeURIComponent(
                                    version.imagePath.split("/").at(-1) ?? ""
                                  )}`}
                                />
                              ) : null}
                              <FeedbackPanel
                                notes={getFeedbackNotes("image", version.id)}
                                onNotesChange={(notes) => onFeedbackNotesChange("image", notes, version.id)}
                                onSave={(status) => onSaveFeedback("image", status, version.id)}
                                placeholder={"What worked or missed for this exact image?"}
                                saved={savedFeedbackKey === `image:${version.id}`}
                                saving={savingFeedbackKey === `image:${version.id}`}
                                status={version.status}
                                title="Image Evaluation"
                                versionLabel={version.id}
                              />
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-charcoal/45 px-5 text-center">
                    <p className="max-w-md text-sm leading-6 text-white/52">
                      Generate an image from this channel&apos;s internal visual brief. The file will be saved locally in the run folder.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
