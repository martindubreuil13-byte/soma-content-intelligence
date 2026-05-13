import { getAgentTrainingSummary } from "@/lib/agent-training";
import { getContentRuns } from "@/lib/output-runs";
import { readPersistentLearningSignals } from "@/lib/agent-training";
import type { LearningEvent, TrainingStage } from "@/lib/agent-training";
import type { ContentChannel } from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";
import TrainingInjectionsClient from "./training-injections-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stages: TrainingStage[] = [
  "Observer",
  "Intern",
  "Junior Operator",
  "Operator",
  "Senior Operator",
  "Specialist",
  "Autonomous Operator",
  "Strategic Partner"
];

function RejectionReasonBreakdown({ events }: { events: LearningEvent[] }) {
  const rejections = events.filter((e) => e.action === "rejected");
  const reasons: Record<string, number> = {};

  rejections.forEach((e) => {
    if (e.notes) {
      const words = e.notes.toLowerCase().split(/\s+/).slice(0, 3).join(" ");
      reasons[words] = (reasons[words] ?? 0) + 1;
    }
  });

  const sorted = Object.entries(reasons)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (!sorted.length) return <p className="text-sm text-white/40">No rejection notes yet.</p>;

  return (
    <div className="grid gap-2">
      {sorted.map(([reason, count]) => (
        <div key={reason} className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-plasma/60"
              style={{ width: `${Math.min(100, (count / rejections.length) * 100)}%` }}
            />
          </div>
          <span className="w-32 text-right text-xs text-white/45">{reason}</span>
          <span className="w-4 text-right text-xs font-semibold text-white/60">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ChannelBreakdown({ events }: { events: LearningEvent[] }) {
  const channels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

  return (
    <div className="grid gap-3">
      {channels.map((ch) => {
        const chEvents = events.filter((e) => e.channel === ch && (e.action === "approved" || e.action === "rejected"));
        const approved = chEvents.filter((e) => e.action === "approved").length;
        const total = chEvents.length;
        const rate = total > 0 ? Math.round((approved / total) * 100) : null;

        return (
          <div key={ch} className="flex items-center gap-3">
            <span className="w-20 text-xs font-semibold text-white/55">{channelLabels[ch]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-plasma to-ember"
                style={{ width: rate !== null ? `${rate}%` : "0%" }}
              />
            </div>
            <span className="w-12 text-right text-xs text-white/45">
              {rate !== null ? `${rate}%` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function TrainingPage() {
  const runs = await getContentRuns();
  const [trainingSummary, allEvents] = await Promise.all([
    getAgentTrainingSummary(runs),
    readPersistentLearningSignals()
  ]);

  const currentStageIndex = stages.indexOf(trainingSummary.stage);
  const evaluatedEvents = allEvents.filter((e) => e.action === "approved" || e.action === "rejected");
  const captionEvents = evaluatedEvents.filter((e) => e.artifactType === "caption");
  const imageEvents = evaluatedEvents.filter((e) => e.artifactType === "image");
  const firstPassEvents = evaluatedEvents.filter((e) => e.isFirstPass && e.action === "approved");
  const firstPassRate = evaluatedEvents.filter((e) => e.isFirstPass).length > 0
    ? Math.round((firstPassEvents.length / evaluatedEvents.filter((e) => e.isFirstPass).length) * 100)
    : null;
  const captionApprovalRate = captionEvents.length > 0
    ? Math.round((captionEvents.filter((e) => e.action === "approved").length / captionEvents.length) * 100)
    : null;
  const imageApprovalRate = imageEvents.length > 0
    ? Math.round((imageEvents.filter((e) => e.action === "approved").length / imageEvents.length) * 100)
    : null;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">Reinforcement Learning</p>
          <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Training Center</h1>
          <p className="mt-2 text-sm text-white/45">
            Every review decision trains the agent. Track progress and alignment.
          </p>
        </div>

        {/* Stage progress */}
        <section className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-peach/55">Current stage</p>
              <h2 className="mt-2 font-display text-4xl text-white">{trainingSummary.stage}</h2>
              <p className="mt-1 text-sm text-white/52">{trainingSummary.stageDescription}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-5xl text-white">{trainingSummary.score}</p>
              <p className="text-sm text-white/40">out of 100</p>
            </div>
          </div>

          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-plasma via-peach to-ember transition-all duration-700"
              style={{ width: `${trainingSummary.score}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-white/35">
            <span>0</span>
            {trainingSummary.nextStage ? (
              <span className="text-peach/60">Next: {trainingSummary.nextStage}</span>
            ) : (
              <span className="text-peach/60">Maximum stage reached</span>
            )}
            <span>100</span>
          </div>

          <p className="mt-4 text-xs text-white/35">
            Maturity cap {trainingSummary.maturityCap} — unlocks with more evaluated samples
          </p>
        </section>

        {/* Stage milestones */}
        <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/38">Stage progression</p>
          <div className="grid gap-2">
            {stages.map((stage, i) => {
              const isPast = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${
                    isCurrent
                      ? "border border-plasma/25 bg-plasma/[0.08]"
                      : isPast
                      ? "opacity-50"
                      : "opacity-30"
                  }`}
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isCurrent ? "bg-peach" : isPast ? "bg-emerald-400" : "bg-white/20"
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${isCurrent ? "text-white" : "text-white/70"}`}
                  >
                    {stage}
                  </span>
                  {isCurrent && (
                    <span className="ml-auto text-xs font-semibold text-peach">Current</span>
                  )}
                  {isPast && (
                    <span className="ml-auto text-xs text-emerald-400">Complete</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Evaluated", value: trainingSummary.evaluatedSamples },
            { label: "Approved", value: trainingSummary.approved },
            { label: "Rejected", value: trainingSummary.rejected },
            { label: "Caption rate", value: captionApprovalRate !== null ? `${captionApprovalRate}%` : "—" },
            { label: "Image rate", value: imageApprovalRate !== null ? `${imageApprovalRate}%` : "—" },
            { label: "First-pass rate", value: firstPassRate !== null ? `${firstPassRate}%` : "—" },
            { label: "Raw score", value: trainingSummary.rawScore.toFixed(1) },
            { label: "Regen penalty", value: trainingSummary.regenerationPenalty.toFixed(1) }
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/38">{label}</p>
              <p className="mt-1.5 font-display text-2xl text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Per-channel breakdown */}
        <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/38">Approval rate by channel</p>
          <ChannelBreakdown events={allEvents} />
        </section>

        {/* Rejection reasons */}
        <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
            Common rejection themes
          </p>
          <RejectionReasonBreakdown events={allEvents} />
          <p className="mt-4 text-xs leading-5 text-white/30">
            Extracted from rejection notes. Longer notes give better signal.
          </p>
        </section>

        <TrainingInjectionsClient />
      </div>
    </div>
  );
}
