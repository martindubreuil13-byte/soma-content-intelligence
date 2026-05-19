import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { listExecutionJobs } from "@/lib/db/execution-jobs-db";
import { getContentRuns } from "@/lib/output-runs";
import { readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel, ContentRun } from "@/lib/content-types";
import { AgentOrb } from "@/components/soma/agent-orb";
import { MaturityIndicator } from "@/components/soma/maturity-indicator";
import { TodayInteraction } from "@/components/soma/today-interaction";
import type { OrbState } from "@/components/soma/agent-orb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const channelList: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMaturityLevel(score: number): number {
  if (score >= 85) return 4;
  if (score >= 65) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

function getOrbState(score: number, runsCount: number, pending: number): OrbState {
  if (runsCount === 0) return "idle";
  if (pending > 0) return "preparing";
  if (score < 30) return "learning";
  return "idle";
}

function getRunStatus(run: ContentRun) {
  const all = channelList.map((ch) => run.channels[ch]);
  const captionApproved = all.filter((p) => p.feedback.caption.status === "approved").length;
  const imageApproved = all.filter((p) => p.feedback.image.status === "approved").length;
  const anyPending = all.some((p) => p.feedback.caption.status === "pending");
  if (captionApproved === channelList.length && imageApproved === channelList.length)
    return { label: "Ready", color: "emerald" as const };
  if (anyPending) return { label: "Needs review", color: "violet" as const };
  if (captionApproved > 0 || imageApproved > 0) return { label: "In review", color: "amber" as const };
  return { label: "Draft", color: "neutral" as const };
}

type SomaSpeech = {
  headline: string;
  body: string;
  primaryLabel: string;
  composerPlaceholder: string;
  suggestions: string[];
};

function getSomaSpeech(score: number, runsCount: number, pending: number): SomaSpeech {
  if (runsCount === 0) {
    return {
      headline: "I'm ready to learn.",
      body: "I don't know your business yet. Start by telling me what you do, who you serve, or what kind of content feels right to you.",
      primaryLabel: "Teach SOMA",
      composerPlaceholder: "Tell me about your business, your audience, or what kind of content feels right…",
      suggestions: [
        "Let me tell you about my business",
        "Here's a piece of content I want you to learn from",
        "Help me define what sounds like my brand",
      ],
    };
  }

  if (pending > 0 && score >= 30) {
    return {
      headline: pending === 1 ? "I prepared something." : "I prepared a few directions.",
      body: "Based on what I've learned from your feedback so far. Your reaction is how I keep improving.",
      primaryLabel: "Talk to SOMA",
      composerPlaceholder: "Tell me what you noticed, what changed, or what direction to explore…",
      suggestions: [
        "Let's try a different angle today",
        "I want to focus on this direction this week",
        "I want to push this further",
      ],
    };
  }

  if (score < 25) {
    return {
      headline: "I'm still learning.",
      body: "Every piece of feedback shapes how I think about your brand. The more you teach me, the better I become.",
      primaryLabel: "Talk to SOMA",
      composerPlaceholder: "Share something you liked, give me direction, or tell me what to avoid…",
      suggestions: [
        "Here's a reference I want you to learn from",
        "This is the tone I'm going for",
        "I want to avoid this style going forward",
      ],
    };
  }

  if (score >= 60) {
    return {
      headline: "I'm aligned with your direction.",
      body: "I have a solid sense of what works for your brand. Tell me what you want to focus on today.",
      primaryLabel: "Talk to SOMA",
      composerPlaceholder: "Share a brief, an idea, or tell me what to focus on today…",
      suggestions: [
        "Create something from this idea",
        "What direction should we push this week?",
        "Let's explore a new angle",
      ],
    };
  }

  return {
    headline: "I've been observing.",
    body: "Your approval patterns are shaping my understanding. I can create from what I know, or you can teach me something new.",
    primaryLabel: "Talk to SOMA",
    composerPlaceholder: "Share a thought, describe what you want to create, or give me direction…",
    suggestions: [
      "Create a post from this idea",
      "Here's a reference I want you to learn from",
      "I want to try a different angle today",
    ],
  };
}

const statusBadge = {
  emerald: "border-emerald-300/20 bg-emerald-300/6 text-emerald-200/70",
  violet:  "border-violet-soft/22 bg-violet-deep/10 text-violet-pale",
  amber:   "border-soma-rose/20 bg-soma-rose/6 text-soma-pearl",
  neutral: "border-white/[0.07] bg-transparent text-white/30",
};

// ─── Slim run row ─────────────────────────────────────────────────────────────

function SlimRunRow({ run }: { run: ContentRun }) {
  const status = getRunStatus(run);
  const preview =
    (run.hasOriginalIdea ? run.originalIdea : run.channels.linkedin?.caption ?? "Generated content")
      ?.slice(0, 82)
      ?.replace(/\n/g, " ") ?? "";

  return (
    <Link
      href={`/review/${encodeURIComponent(run.id)}`}
      className="group flex items-center justify-between gap-4 rounded-[12px] px-3 py-2.5 transition hover:bg-white/[0.04]"
    >
      <p className="min-w-0 truncate text-[13px] text-white/40 transition group-hover:text-white/62">
        {preview}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge[status.color]}`}>
          {status.label}
        </span>
        <ArrowRight size={11} className="text-white/16 transition group-hover:text-white/38" />
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const [runs, queue, jobs] = await Promise.all([
    getContentRuns(),
    readPublishingQueue(),
    listExecutionJobs({ limit: 4 }).catch(() => []),
  ]);
  const summary = await getAgentTrainingSummary(runs);

  const queueCount = queue.filter((q) => q.status === "approved").length;
  const pendingRuns = runs.filter((r) => getRunStatus(r).color === "violet").length;
  const speech = getSomaSpeech(summary.score, runs.length, pendingRuns);
  const orbState = getOrbState(summary.score, runs.length, pendingRuns);
  const maturityLevel = getMaturityLevel(summary.score);

  const secondaryLabel =
    pendingRuns > 0
      ? pendingRuns === 1
        ? "Review the draft I prepared"
        : `Review the ${pendingRuns} drafts I prepared`
      : runs.length === 0
      ? "Upload a reference"
      : undefined;

  const secondaryHref =
    pendingRuns > 0 ? "/review" : runs.length === 0 ? "/assets" : undefined;

  const approvalRate =
    summary.evaluatedSamples > 0
      ? Math.round((summary.approved / summary.evaluatedSamples) * 100)
      : 0;

  return (
    <div className="min-h-screen px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[760px]">

        {/* ── Presence ── */}
        <div className="flex flex-col items-center text-center">
          <AgentOrb state={orbState} size="xl" maturityLevel={maturityLevel} />

          <h1 className="mt-9 font-display text-4xl text-white/90 sm:text-5xl">
            {speech.headline}
          </h1>

          <p className="mx-auto mt-5 max-w-[400px] text-[15px] leading-7 text-white/40">
            {speech.body}
          </p>

          <TodayInteraction
            primaryLabel={speech.primaryLabel}
            suggestions={speech.suggestions}
            placeholder={speech.composerPlaceholder}
            secondaryLabel={secondaryLabel}
            secondaryHref={secondaryHref}
          />
        </div>

        {/* ── Section divider ── */}
        <div className="mt-16 flex items-center gap-5">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.32em] text-white/18">
            Context
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>

        {/* ── Disclosures ── */}
        <div className="mt-0 divide-y" style={{ borderColor: "transparent" }}>

          {/* What SOMA remembers */}
          <details className="group" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <summary className="flex cursor-pointer select-none items-center justify-between py-4">
              <span className="text-[13px] font-semibold text-white/30 transition group-open:text-white/55 hover:text-white/52">
                What SOMA remembers
              </span>
              <ChevronDown
                size={13}
                className="text-white/22 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>

            <div className="space-y-4 pb-7 pt-1">
              <MaturityIndicator score={summary.score} />
              <div className="space-y-1.5 text-[13px] leading-6 text-white/32">
                <p>— {summary.stage}: {summary.stageDescription}</p>
                {summary.evaluatedSamples > 0 ? (
                  <p>
                    — Reviewed {summary.evaluatedSamples} piece{summary.evaluatedSamples !== 1 ? "s" : ""},
                    {" "}{summary.approved} approved
                    {summary.evaluatedSamples > 0 ? ` · ${approvalRate}% approval rate` : ""}
                  </p>
                ) : (
                  <p>— No reviews yet. I&apos;m learning from scratch.</p>
                )}
                {queueCount > 0 && (
                  <p>
                    — {queueCount} piece{queueCount !== 1 ? "s" : ""} approved and ready to publish.
                  </p>
                )}
              </div>
              <Link
                href="/memory"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-violet-pale/55 transition hover:text-violet-pale"
              >
                Full memory report <ArrowRight size={11} />
              </Link>
            </div>
          </details>

          {/* What SOMA prepared */}
          <details className="group">
            <summary className="flex cursor-pointer select-none items-center justify-between py-4">
              <span className="text-[13px] font-semibold text-white/30 transition group-open:text-white/55 hover:text-white/52">
                What SOMA prepared
              </span>
              <div className="flex items-center gap-2">
                {runs.length > 0 && (
                  <span className="rounded-full border border-violet-soft/16 bg-violet-deep/8 px-2 py-0.5 text-[10px] font-semibold text-violet-pale/50">
                    {runs.length}
                  </span>
                )}
                <ChevronDown
                  size={13}
                  className="text-white/22 transition-transform duration-200 group-open:rotate-180"
                />
              </div>
            </summary>

            <div className="pb-7 pt-1">
              {runs.length === 0 ? (
                <p className="text-[13px] text-white/28">
                  No drafts yet. Start a mission and I&apos;ll prepare content for your review.
                </p>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {runs.map((run) => (
                      <SlimRunRow key={run.id} run={run} />
                    ))}
                  </div>
                  <div className="mt-4 pl-3">
                    <Link
                      href="/review"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/25 transition hover:text-white/48"
                    >
                      Open full review <ArrowRight size={11} />
                    </Link>
                  </div>
                </>
              )}

              {jobs.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20">
                    Working right now
                  </p>
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-[10px] px-3 py-2 text-xs"
                      style={{ background: "rgba(255,255,255,0.025)" }}
                    >
                      <span className="text-white/38">{job.jobType.replace(/_/g, " ")}</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${
                        job.status === "completed" ? "bg-emerald-300/7 text-emerald-200/60"
                        : job.status === "running"  ? "bg-violet-soft/10 text-violet-pale"
                        : "bg-white/[0.04] text-white/28"
                      }`}>
                        {job.status === "queued" && job.retryCount > 0 ? "retrying" : job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

        </div>

      </div>
    </div>
  );
}
