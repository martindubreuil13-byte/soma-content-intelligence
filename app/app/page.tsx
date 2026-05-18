import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { getContentRuns } from "@/lib/output-runs";
import { readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel, ContentRun } from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";
import { requireCurrentOrganization } from "@/lib/auth/current-organization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const channelList: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

function getRunStatus(run: ContentRun) {
  const allChannels = channelList.map((ch) => run.channels[ch]);
  const captionApproved = allChannels.filter((p) => p.feedback.caption.status === "approved").length;
  const imageApproved = allChannels.filter((p) => p.feedback.image.status === "approved").length;
  const anyPending = allChannels.some((p) => p.feedback.caption.status === "pending");

  if (captionApproved === channelList.length && imageApproved === channelList.length) {
    return { label: "Ready to publish", color: "emerald" as const };
  }
  if (captionApproved > 0 || imageApproved > 0) {
    return { label: "In review", color: "ember" as const };
  }
  if (anyPending) {
    return { label: "Needs review", color: "plasma" as const };
  }
  return { label: "Draft", color: "white" as const };
}

function ChannelStatusDots({ run }: { run: ContentRun }) {
  return (
    <div className="flex items-center gap-3">
      {channelList.map((ch) => {
        const pkg = run.channels[ch];
        const captionOk = pkg.feedback.caption.status === "approved";
        const imageOk = pkg.feedback.image.status === "approved";
        const rejected = pkg.feedback.caption.status === "rejected" || pkg.feedback.image.status === "rejected";

        return (
          <div key={ch} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/38">
              {channelLabels[ch].slice(0, 2)}
            </span>
            <div className="flex gap-0.5">
              <div
                className={`h-2 w-2 rounded-full ${captionOk ? "bg-emerald-400" : rejected ? "bg-plasma/70" : "bg-white/20"}`}
                title={`Caption: ${pkg.feedback.caption.status}`}
              />
              <div
                className={`h-2 w-2 rounded-full ${imageOk ? "bg-emerald-400" : rejected ? "bg-plasma/70" : "bg-white/20"}`}
                title={`Image: ${pkg.feedback.image.status}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RunCard({ run, score }: { run: ContentRun; score: number }) {
  const status = getRunStatus(run);
  const captionPreview = run.channels.linkedin?.caption?.slice(0, 120)?.replace(/\n/g, " ") ?? "";

  return (
    <Link
      href={`/review/${encodeURIComponent(run.id)}`}
      className="group relative block overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="warm-line absolute left-0 right-0 top-0 h-px opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-peach/60">
            {run.timestamp}
          </p>
          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/80">
            {run.hasOriginalIdea ? run.originalIdea : "Generated content run"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            status.color === "emerald"
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
              : status.color === "ember"
              ? "border-ember/25 bg-ember/10 text-peach"
              : status.color === "plasma"
              ? "border-plasma/25 bg-plasma/10 text-peach"
              : "border-white/10 bg-white/[0.06] text-white/55"
          }`}
        >
          {status.label}
        </span>
      </div>

      {captionPreview ? (
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-white/52">{captionPreview}…</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <ChannelStatusDots run={run} />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Confidence</p>
            <p className="font-display text-lg text-peach">{score}</p>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3 py-2 text-sm font-semibold text-peach transition duration-200 group-hover:border-plasma/50 group-hover:bg-plasma/[0.14] group-hover:text-white">
            Review
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[48vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] p-10 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-plasma/20 bg-plasma/[0.07]">
        <Loader2 size={22} className="text-peach/70" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-plasma/70">No drafts yet</p>
      <h2 className="mt-3 font-display text-3xl text-white">Nothing to review this morning</h2>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/52">
        Run the generation engine to create content drafts. Once generated, they&apos;ll appear here for review.
      </p>
      <Link
        href="/schedule"
        className="mt-7 flex items-center gap-2 rounded-2xl border border-plasma/30 bg-plasma/[0.1] px-5 py-3 text-sm font-semibold text-peach transition duration-200 hover:border-plasma/50 hover:bg-plasma/[0.16] hover:text-white"
      >
        Configure generation
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export default async function AppPage() {
  await requireCurrentOrganization();

  const [runs, queue] = await Promise.all([getContentRuns(), readPublishingQueue()]);
  const trainingSummary = await getAgentTrainingSummary(runs);
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const queueCount = queue.filter((q) => q.status === "approved").length;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />

      <div className="relative mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">{dateLabel}</p>
              <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Morning desk</h1>
              <p className="mt-2 text-sm text-white/45">
                {runs.length
                  ? `${runs.length} content run${runs.length !== 1 ? "s" : ""} in the archive`
                  : "No content runs yet"}
                {queueCount > 0 ? ` · ${queueCount} ready to publish` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Agent level</p>
              <p className="mt-1 font-display text-2xl text-white">{trainingSummary.stage}</p>
              <p className="text-sm text-peach">{trainingSummary.score}/100</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href="/queue"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
            >
              <CheckCircle2 size={16} className="text-emerald-400" />
              Queue ({queueCount})
            </Link>
            <Link
              href="/training"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
            >
              <div
                className="h-3 w-3 shrink-0 rounded-full bg-gradient-to-r from-plasma to-ember"
                aria-hidden
              />
              Training
            </Link>
            <Link
              href="/intelligence"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
            >
              <div className="h-3 w-3 shrink-0 rounded-full border border-peach/50" aria-hidden />
              Intelligence
            </Link>
            <Link
              href="/schedule"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
            >
              <Clock size={16} className="text-white/45" />
              Schedule
            </Link>
          </div>

          {/* Run cards */}
          {runs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">Content runs</p>
                <div className="flex items-center gap-3 text-[10px] text-white/30">
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    approved
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-plasma/70" />
                    rejected
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-white/20" />
                    pending
                  </span>
                </div>
              </div>
              {runs.map((run) => (
                <RunCard key={run.id} run={run} score={trainingSummary.score} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
