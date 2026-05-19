import Link from "next/link";
import { ArrowRight, Eye, Target, Layers, Clock } from "lucide-react";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { listExecutionJobs } from "@/lib/db/execution-jobs-db";
import { getContentRuns } from "@/lib/output-runs";
import { readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel, ContentRun } from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";
import { AgentOrb } from "@/components/soma/agent-orb";
import { MaturityIndicator } from "@/components/soma/maturity-indicator";
import { ActionCard } from "@/components/soma/action-card";
import { PremiumPanel } from "@/components/soma/premium-panel";
import type { OrbState } from "@/components/soma/agent-orb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const channelList: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

function getAgentState(score: number, runsCount: number): OrbState {
  if (runsCount === 0) return "idle";
  if (score < 30) return "learning";
  if (score < 60) return "preparing";
  return "idle";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getAgentBriefing(score: number, runsCount: number, pendingCount: number): string {
  if (runsCount === 0) {
    return "I'm ready to begin. Start your first mission and I'll learn from everything you create together.";
  }
  if (score < 25) {
    return "I'm still learning your brand and voice. Every piece of feedback you give me shapes how I create.";
  }
  if (pendingCount > 0) {
    return `I've prepared ${pendingCount} piece${pendingCount !== 1 ? "s" : ""} for your review. Your feedback is what helps me grow.`;
  }
  if (score < 60) {
    return "I've reviewed your latest feedback and refined my creative direction. A few drafts are waiting.";
  }
  return "I've analyzed your strongest patterns and aligned today's content with what performs best for your brand.";
}

function getRunStatus(run: ContentRun) {
  const all = channelList.map((ch) => run.channels[ch]);
  const captionApproved = all.filter((p) => p.feedback.caption.status === "approved").length;
  const imageApproved = all.filter((p) => p.feedback.image.status === "approved").length;
  const anyPending = all.some((p) => p.feedback.caption.status === "pending");

  if (captionApproved === channelList.length && imageApproved === channelList.length)
    return { label: "Ready", color: "emerald" as const };
  if (captionApproved > 0 || imageApproved > 0)
    return { label: "In review", color: "amber" as const };
  if (anyPending)
    return { label: "Needs review", color: "violet" as const };
  return { label: "Draft", color: "neutral" as const };
}

const statusStyles = {
  emerald: "border-emerald-300/22 bg-emerald-300/8 text-emerald-200/80",
  amber:   "border-soma-rose/25 bg-soma-rose/10 text-soma-pearl",
  violet:  "border-violet-soft/25 bg-violet-deep/12 text-violet-pale",
  neutral: "border-white/10 bg-white/[0.04] text-white/40",
};

function ChannelDots({ run }: { run: ContentRun }) {
  return (
    <div className="flex items-center gap-2.5">
      {channelList.map((ch) => {
        const pkg = run.channels[ch];
        const ok = pkg.feedback.caption.status === "approved";
        const rejected = pkg.feedback.caption.status === "rejected";
        return (
          <div key={ch} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">
              {channelLabels[ch].slice(0, 2)}
            </span>
            <div
              className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : rejected ? "bg-mist-rose/70" : "bg-white/18"}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function RunCard({ run, score }: { run: ContentRun; score: number }) {
  const status = getRunStatus(run);
  const preview = run.channels.linkedin?.caption?.slice(0, 110)?.replace(/\n/g, " ") ?? "";

  return (
    <Link
      href={`/review/${encodeURIComponent(run.id)}`}
      className="group relative block overflow-hidden rounded-[20px] p-5 transition duration-300"
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(26, 20, 36, 0.6)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background: "linear-gradient(90deg, transparent, rgba(128,112,184,0.8), rgba(168,113,138,0.65), transparent)" }}
      />

      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
            {run.timestamp}
          </p>
          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/72">
            {run.hasOriginalIdea ? run.originalIdea : "Generated content run"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status.color]}`}>
          {status.label}
        </span>
      </div>

      {preview && (
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-white/38">{preview}…</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <ChannelDots run={run} />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/28">Confidence</p>
            <p className="font-display text-base text-soma-pearl">{score}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-[14px] border border-violet-soft/22 bg-violet-deep/12 px-3 py-1.5 text-sm font-semibold text-violet-pale transition duration-200 group-hover:border-violet-soft/42 group-hover:bg-violet-deep/22 group-hover:text-white">
            Review
            <ArrowRight size={13} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function AgentReady() {
  return (
    <div className="flex min-h-[44vh] flex-col items-center justify-center rounded-[24px] p-10 text-center"
      style={{ border: "1px dashed rgba(128,112,184,0.18)", background: "rgba(128,112,184,0.03)" }}
    >
      <AgentOrb state="idle" size="lg" className="mb-6" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-muted/60">Agent ready</p>
      <h2 className="mt-3 font-display text-2xl text-white/80">SOMA is waiting for its first mission</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/38">
        Create a mission to start generating content. SOMA will learn from every piece of feedback you give.
      </p>
      <Link
        href="/missions"
        className="mt-7 flex items-center gap-2 rounded-[14px] border border-violet-soft/28 bg-violet-deep/14 px-5 py-3 text-sm font-semibold text-violet-pale transition duration-200 hover:border-violet-soft/45 hover:bg-violet-deep/22 hover:text-white"
      >
        Start a mission
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export default async function TodayPage() {
  const [runs, queue, jobs] = await Promise.all([
    getContentRuns(),
    readPublishingQueue(),
    listExecutionJobs({ limit: 3 }).catch(() => []),
  ]);
  const trainingSummary = await getAgentTrainingSummary(runs);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const queueCount = queue.filter((q) => q.status === "approved").length;
  const pendingRuns = runs.filter((r) => getRunStatus(r).color === "violet").length;
  const orbState = getAgentState(trainingSummary.score, runs.length);
  const briefing = getAgentBriefing(trainingSummary.score, runs.length, pendingRuns);
  const greeting = getGreeting();

  return (
    <div className="min-h-screen px-5 py-7 sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto max-w-2xl space-y-7">

        {/* Hero — Agent briefing */}
        <PremiumPanel variant="elevated" className="!p-0 overflow-hidden">
          <div className="p-7">
            <div className="flex items-start gap-6">
              <AgentOrb state={orbState} size="lg" className="mt-1 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/28">
                  {dateLabel}
                </p>
                <h1 className="mt-2 font-display text-2xl text-white sm:text-3xl">
                  {greeting}.
                </h1>
                <p className="mt-2.5 text-sm leading-6 text-white/55 max-w-sm">
                  {briefing}
                </p>

                <div className="mt-5">
                  <MaturityIndicator score={trainingSummary.score} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom strip — quick stats */}
          <div
            className="flex items-center gap-6 px-7 py-3.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.055)", background: "rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
              <span className="text-[11px] text-white/40">{queueCount} ready to publish</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-soft/70" />
              <span className="text-[11px] text-white/40">{pendingRuns} awaiting review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-soma-mist/50" />
              <span className="text-[11px] text-white/40">{runs.length} total runs</span>
            </div>
          </div>
        </PremiumPanel>

        {/* Priority actions */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
            What to do today
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <ActionCard
              title="New mission"
              href="/missions"
              icon={<Target size={14} />}
              variant="primary"
            />
            <ActionCard
              title="Review drafts"
              href="/review"
              count={pendingRuns}
              icon={<Eye size={14} />}
            />
            <ActionCard
              title="Assets"
              href="/assets"
              icon={<Layers size={14} />}
            />
            <ActionCard
              title="Queue"
              count={queueCount}
              href="/queue"
              icon={<Clock size={14} />}
            />
          </div>
        </div>

        {/* Execution jobs (if any active) */}
        {jobs.length > 0 && (
          <PremiumPanel variant="subtle">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
              Work in progress
            </p>
            <div className="space-y-1.5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-xs"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="truncate font-semibold text-white/52">
                    {job.jobType.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                      job.status === "completed"
                        ? "bg-emerald-300/8 text-emerald-200/70"
                        : job.status === "running"
                          ? "bg-violet-soft/12 text-violet-pale"
                          : job.status === "failed"
                            ? "bg-mist-rose/10 text-soma-pearl/70"
                            : "bg-white/[0.05] text-white/38"
                    }`}
                  >
                    {job.status === "queued" && job.retryCount > 0 ? "retrying" : job.status}
                  </span>
                </div>
              ))}
            </div>
          </PremiumPanel>
        )}

        {/* Content runs */}
        <div>
          {runs.length === 0 ? (
            <AgentReady />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
                  Ready for review
                </p>
                <div className="flex items-center gap-3 text-[9px] text-white/25">
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />approved</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-mist-rose/70" />rejected</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white/18" />pending</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {runs.map((run) => (
                  <RunCard key={run.id} run={run} score={trainingSummary.score} />
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
