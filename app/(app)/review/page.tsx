import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { getContentRuns } from "@/lib/output-runs";
import type { ContentChannel, ContentRun } from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";
import { AgentOrb } from "@/components/soma/agent-orb";
import { PremiumPanel } from "@/components/soma/premium-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const channelList: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

function getRunStatus(run: ContentRun) {
  const all = channelList.map((ch) => run.channels[ch]);
  const captionApproved = all.filter((p) => p.feedback.caption.status === "approved").length;
  const imageApproved = all.filter((p) => p.feedback.image.status === "approved").length;
  const anyPending = all.some((p) => p.feedback.caption.status === "pending");

  if (captionApproved === channelList.length && imageApproved === channelList.length)
    return { label: "Ready", priority: 0, color: "emerald" as const };
  if (anyPending)
    return { label: "Needs review", priority: 1, color: "violet" as const };
  if (captionApproved > 0 || imageApproved > 0)
    return { label: "In review", priority: 2, color: "amber" as const };
  return { label: "Draft", priority: 3, color: "neutral" as const };
}

const statusStyles = {
  emerald: "border-emerald-300/22 bg-emerald-300/8 text-emerald-200/80",
  violet:  "border-violet-soft/25 bg-violet-deep/12 text-violet-pale",
  amber:   "border-soma-rose/22 bg-soma-rose/8 text-soma-pearl",
  neutral: "border-white/10 bg-white/[0.04] text-white/38",
};

function ReviewCard({ run, score }: { run: ContentRun; score: number }) {
  const status = getRunStatus(run);
  const preview = run.channels.linkedin?.caption?.slice(0, 130)?.replace(/\n/g, " ") ?? "";

  return (
    <Link
      href={`/review/${encodeURIComponent(run.id)}`}
      className="group relative block overflow-hidden rounded-[20px] p-5 transition duration-300"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(26, 20, 36, 0.6)" }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background: "linear-gradient(90deg, transparent, rgba(128,112,184,0.8), rgba(168,113,138,0.65), transparent)" }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">{run.timestamp}</p>
          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/70">
            {run.hasOriginalIdea ? run.originalIdea : "Generated content run"}
          </p>
          {preview && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{preview}…</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status.color]}`}>
            {status.label}
          </span>
          <div className="flex items-center gap-1.5 rounded-[12px] border border-violet-soft/20 bg-violet-deep/10 px-3 py-1.5 text-xs font-semibold text-violet-pale transition group-hover:border-violet-soft/38 group-hover:text-white">
            Open
            <ArrowRight size={12} />
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {channelList.map((ch) => {
            const pkg = run.channels[ch];
            const ok = pkg.feedback.caption.status === "approved";
            const rejected = pkg.feedback.caption.status === "rejected";
            return (
              <div key={ch} className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">
                  {channelLabels[ch].slice(0, 2)}
                </span>
                <div className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : rejected ? "bg-mist-rose/65" : "bg-white/16"}`} />
              </div>
            );
          })}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/25">Confidence</p>
          <p className="font-display text-sm text-soma-pearl">{score}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function ReviewPage() {
  const runs = await getContentRuns();
  const trainingSummary = await getAgentTrainingSummary(runs);

  const sorted = [...runs].sort((a, b) => {
    return getRunStatus(a).priority - getRunStatus(b).priority;
  });

  const needsReview = sorted.filter((r) => getRunStatus(r).color === "violet").length;

  return (
    <div className="min-h-screen px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-7">

        {/* Header */}
        <div className="flex items-start gap-5">
          <AgentOrb state={needsReview > 0 ? "preparing" : "idle"} size="md" className="mt-1 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">Review</p>
            <h1 className="mt-1.5 font-display text-2xl text-white sm:text-3xl">
              {needsReview > 0
                ? `${needsReview} draft${needsReview !== 1 ? "s" : ""} waiting for you`
                : "All caught up"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/42">
              Approve, improve, or reject — every decision teaches SOMA your preferences.
            </p>
          </div>
        </div>

        {sorted.length === 0 ? (
          <PremiumPanel variant="subtle" className="flex flex-col items-center py-14 text-center">
            <AgentOrb state="idle" size="lg" className="mb-5" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/28">Nothing here yet</p>
            <p className="mt-2 text-sm text-white/40">Start a mission and SOMA will prepare drafts for review.</p>
            <Link
              href="/missions"
              className="mt-6 flex items-center gap-2 rounded-[14px] border border-violet-soft/25 bg-violet-deep/12 px-5 py-2.5 text-sm font-semibold text-violet-pale transition hover:border-violet-soft/40 hover:text-white"
            >
              New mission
              <ArrowRight size={14} />
            </Link>
          </PremiumPanel>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((run) => (
              <ReviewCard key={run.id} run={run} score={trainingSummary.score} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
