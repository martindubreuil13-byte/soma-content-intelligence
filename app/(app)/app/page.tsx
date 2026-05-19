import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { listExecutionJobs } from "@/lib/db/execution-jobs-db";
import { getContentRuns } from "@/lib/output-runs";
import { readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel, ContentRun } from "@/lib/content-types";
import { AgentOrb } from "@/components/soma/agent-orb";
import { AgentMessage } from "@/components/soma/agent-message";
import { AgentComposer } from "@/components/soma/agent-composer";
import { MaturityIndicator } from "@/components/soma/maturity-indicator";
import type { OrbState } from "@/components/soma/agent-orb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const channelList: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getOrbState(score: number, runsCount: number, pending: number): OrbState {
  if (runsCount === 0) return "idle";
  if (pending > 0) return "preparing";
  if (score < 30) return "learning";
  return "idle";
}

function getAgentMessage(score: number, runsCount: number, pending: number): string {
  if (runsCount === 0) {
    return "I'm still learning your business. The more you teach me, the better I'll become.";
  }
  if (score < 25) {
    return "I'm building my understanding of your brand. Every piece of feedback shapes how I create.";
  }
  if (pending > 0) {
    return `I've prepared ${pending} draft${pending !== 1 ? "s" : ""} based on what I've learned so far. Your feedback is how I improve.`;
  }
  if (score < 60) {
    return "I've been learning from your recent reviews and refining my creative direction.";
  }
  return "I've analyzed your most effective patterns and I'm ready to create content aligned with your brand.";
}

function getInsights(pending: number, queueCount: number, score: number, runsCount: number): string[] {
  if (runsCount === 0) return [];
  const out: string[] = [];
  if (pending > 0) out.push(`${pending} draft${pending !== 1 ? "s" : ""} waiting for your feedback.`);
  if (queueCount > 0) out.push(`${queueCount} approved piece${queueCount !== 1 ? "s" : ""} ready to publish.`);
  if (out.length === 0 && score > 0) out.push("All caught up — give me a new direction to work on.");
  return out.slice(0, 2);
}

function getSuggestions(score: number, runsCount: number): string[] {
  if (runsCount === 0) {
    return [
      "Tell me about your business and who you serve",
      "Create my first piece of content",
      "Help me define my brand voice",
    ];
  }
  const list = ["Create a sharp post from an idea I have"];
  if (score < 40) list.push("Here's a visual reference I want you to learn from");
  list.push("Help me promote something specific today");
  if (score >= 40) list.push("What content direction has worked best recently?");
  return list.slice(0, 4);
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

const statusBadge = {
  emerald: "border-emerald-300/20 bg-emerald-300/6 text-emerald-200/70",
  violet:  "border-violet-soft/22 bg-violet-deep/10 text-violet-pale",
  amber:   "border-soma-rose/20 bg-soma-rose/6 text-soma-pearl",
  neutral: "border-white/[0.07] bg-transparent text-white/32",
};

// ─── Slim run row ─────────────────────────────────────────────────────────────

function SlimRunRow({ run }: { run: ContentRun }) {
  const status = getRunStatus(run);
  const preview =
    (run.hasOriginalIdea ? run.originalIdea : run.channels.linkedin?.caption ?? "Generated content")
      ?.slice(0, 90)
      ?.replace(/\n/g, " ") ?? "";

  return (
    <Link
      href={`/review/${encodeURIComponent(run.id)}`}
      className="group flex items-center justify-between gap-4 rounded-[14px] px-4 py-3 transition hover:bg-white/[0.04]"
    >
      <p className="min-w-0 truncate text-[13px] text-white/45 group-hover:text-white/65 transition">
        {preview}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge[status.color]}`}>
          {status.label}
        </span>
        <ArrowRight size={12} className="text-white/18 group-hover:text-white/40 transition" />
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

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const queueCount = queue.filter((q) => q.status === "approved").length;
  const pendingRuns = runs.filter((r) => getRunStatus(r).color === "violet").length;

  const orbState = getOrbState(summary.score, runs.length, pendingRuns);
  const message = getAgentMessage(summary.score, runs.length, pendingRuns);
  const insights = getInsights(pendingRuns, queueCount, summary.score, runs.length);
  const suggestions = getSuggestions(summary.score, runs.length);
  const greeting = getGreeting();

  const memorySignals = [
    { label: "Maturity",   value: summary.stage },
    { label: "Confidence", value: `${summary.score}/100` },
    { label: "Evaluated",  value: String(summary.evaluatedSamples) },
    { label: "Queue",      value: `${queueCount} ready` },
  ];

  return (
    <div className="min-h-screen px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[920px]">

        {/* ── Hero ── */}
        <div className="flex flex-col items-center">
          <AgentOrb state={orbState} size="xl" />
          <AgentMessage
            greeting={`${greeting}.`}
            message={message}
            insights={insights}
            dateLabel={dateLabel}
          />
        </div>

        {/* ── Memory signals ── */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {memorySignals.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] px-3 py-1 text-[11px] font-semibold text-white/30"
            >
              <span className="h-1 w-1 rounded-full bg-violet-soft/50" />
              {s.label}
              <span className="text-white/16">·</span>
              {s.value}
            </span>
          ))}
        </div>

        {/* ── Composer ── */}
        <div className="mt-10">
          <AgentComposer suggestions={suggestions} />
        </div>

        {/* ── Progressive disclosure: what SOMA knows ── */}
        <details className="group mt-10">
          <summary className="flex w-full cursor-pointer select-none items-center justify-center gap-2 text-[12px] font-semibold text-white/28 transition hover:text-white/48">
            <ChevronDown
              size={14}
              className="transition-transform duration-200 group-open:rotate-180"
            />
            Show what SOMA knows right now
          </summary>

          <div className="mt-6 space-y-5">
            {/* Maturity */}
            <div
              className="rounded-[18px] p-5"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(26,20,36,0.5)" }}
            >
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
                Agent maturity
              </p>
              <MaturityIndicator score={summary.score} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Evaluated",     value: summary.evaluatedSamples },
                { label: "Approved",      value: summary.approved },
                { label: "Raw score",     value: Math.round(summary.rawScore) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[16px] p-4 text-center"
                  style={{ border: "1px solid rgba(255,255,255,0.065)", background: "rgba(255,255,255,0.02)" }}
                >
                  <p className="font-display text-xl text-soma-pearl">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] text-white/28">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Execution jobs */}
            {jobs.length > 0 && (
              <div
                className="rounded-[16px] p-4"
                style={{ border: "1px solid rgba(255,255,255,0.065)", background: "rgba(255,255,255,0.02)" }}
              >
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
                  Work in progress
                </p>
                <div className="space-y-1.5">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.025)" }}>
                      <span className="truncate text-white/45">{job.jobType.replace(/_/g, " ")}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                        job.status === "completed" ? "bg-emerald-300/7 text-emerald-200/65"
                        : job.status === "running"  ? "bg-violet-soft/10 text-violet-pale"
                        : job.status === "failed"   ? "bg-mist-rose/8 text-soma-pearl/65"
                        : "bg-white/[0.04] text-white/35"
                      }`}>
                        {job.status === "queued" && job.retryCount > 0 ? "retrying" : job.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="flex gap-2.5">
              <Link href="/memory" className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-violet-soft/18 bg-violet-deep/8 py-2.5 text-xs font-semibold text-violet-pale/70 transition hover:border-violet-soft/32 hover:text-violet-pale">
                Full memory report
                <ArrowRight size={11} />
              </Link>
              <Link href="/training" className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-white/[0.07] bg-transparent py-2.5 text-xs font-semibold text-white/35 transition hover:border-white/12 hover:text-white/55">
                Training detail
                <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </details>

        {/* ── Content runs — secondary, below fold ── */}
        {runs.length > 0 && (
          <div className="mt-12">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/22">
                {runs.length} draft{runs.length !== 1 ? "s" : ""} in memory
              </p>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>

            <div className="space-y-0.5">
              {runs.map((run) => (
                <SlimRunRow key={run.id} run={run} />
              ))}
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/review"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/28 transition hover:text-white/50"
              >
                Open full review
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
