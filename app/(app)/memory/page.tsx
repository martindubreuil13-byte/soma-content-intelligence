import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { getSomaTruthState, isFirstContactState } from "@/lib/db/soma-truth-state-db";
import { getContentRuns } from "@/lib/output-runs";
import { AgentOrb } from "@/components/soma/agent-orb";
import { MaturityIndicator } from "@/components/soma/maturity-indicator";
import { PremiumPanel } from "@/components/soma/premium-panel";

export const dynamic = "force-dynamic";

const MEMORY_SECTIONS = [
  {
    id: "brand",
    label: "Brand",
    description: "Core identity, positioning, and what makes you different",
    detail: "Used in every piece of content SOMA creates",
    href: "/intelligence",
    color: "violet",
  },
  {
    id: "audience",
    label: "Audience",
    description: "Who you serve, their pain points, and what drives them",
    detail: "Shapes tone, angle, and hook selection",
    href: "/intelligence",
    color: "rose",
  },
  {
    id: "voice",
    label: "Voice & Tone",
    description: "How you communicate — directness, warmth, vocabulary",
    detail: "Applied to captions, headlines, and CTAs",
    href: "/intelligence",
    color: "pearl",
  },
  {
    id: "rules",
    label: "Rules",
    description: "What to always do and what to always avoid",
    detail: "Active constraints that guide every output",
    href: "/intelligence",
    color: "mist",
  },
];

const COLOR_MAP: Record<string, string> = {
  violet: "border-violet-soft/22 bg-violet-deep/10",
  rose:   "border-mist-rose/22 bg-mist-rose/8",
  pearl:  "border-soma-pearl/18 bg-soma-pearl/6",
  mist:   "border-soma-mist/15 bg-white/[0.03]",
};

const ICON_COLOR: Record<string, string> = {
  violet: "text-violet-pale",
  rose:   "text-soma-pearl",
  pearl:  "text-soma-pearl/70",
  mist:   "text-white/35",
};

export default async function MemoryPage() {
  let score = 0;
  let stage = "Observer";
  let evaluatedSamples = 0;
  let approved = 0;
  let isFirstContact = false;

  try {
    const [runs, truthState] = await Promise.all([
      getContentRuns({ includeLegacyFallback: false }),
      getSomaTruthState(),
    ]);
    const summary = await getAgentTrainingSummary(runs);
    score = summary.score;
    stage = summary.stage;
    evaluatedSamples = summary.evaluatedSamples;
    approved = summary.approved;
    isFirstContact = isFirstContactState(truthState);
  } catch {
    // Use defaults
  }

  const approvalRate = evaluatedSamples > 0 ? Math.round((approved / evaluatedSamples) * 100) : 0;

  return (
    <div className="min-h-screen px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-7">

        {/* Header */}
        <div className="flex items-start gap-5">
          <AgentOrb state="learning" size="md" className="mt-1 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
              Memory
            </p>
            <h1 className="mt-1.5 font-display text-2xl text-white sm:text-3xl">
              {isFirstContact ? "What SOMA understands so far" : "What SOMA knows"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/45">
              {isFirstContact
                ? "No memory has been earned yet. Teach SOMA through context, references, and feedback."
                : "Everything SOMA has learned about your business, brand, audience, and creative preferences."}
            </p>
          </div>
        </div>

        {/* Agent intelligence card */}
        <PremiumPanel variant="elevated">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
              Agent intelligence
            </p>
            <span className="text-xs text-white/30">{stage}</span>
          </div>
          {isFirstContact ? (
            <div className="space-y-1 text-sm leading-6 text-white/35">
              <p>— No audience defined yet</p>
              <p>— No visual references yet</p>
              <p>— No learned tone patterns yet</p>
              <p>— No approved directions yet</p>
            </div>
          ) : (
            <>
              <MaturityIndicator score={score} />

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Evaluated",      value: evaluatedSamples },
                  { label: "Approved",       value: approved },
                  { label: "Approval rate",  value: `${approvalRate}%` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[14px] p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="font-display text-lg text-soma-pearl">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-white/30">{stat.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 flex gap-2">
            <Link
              href="/training"
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-violet-soft/22 bg-violet-deep/10 py-2.5 text-xs font-semibold text-violet-pale transition hover:border-violet-soft/38 hover:bg-violet-deep/18 hover:text-white"
            >
              Training detail
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/intelligence"
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-white/[0.07] bg-white/[0.03] py-2.5 text-xs font-semibold text-white/45 transition hover:border-white/12 hover:text-white/70"
            >
              Brand intelligence
              <ArrowRight size={12} />
            </Link>
          </div>
        </PremiumPanel>

        {/* Memory sections */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
              Stored knowledge
            </p>
            <Link
              href="/intelligence"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-pale/70 transition hover:text-violet-pale"
            >
              <Plus size={12} />
              Add memory
            </Link>
          </div>

          <div className="space-y-2">
            {MEMORY_SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className={`group flex items-center justify-between gap-4 rounded-[16px] border p-4 transition duration-200 hover:border-white/14 ${COLOR_MAP[section.color]}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold ${ICON_COLOR[section.color]}`}>
                      {section.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50 leading-5">{section.description}</p>
                  <p className="mt-1 text-[10px] text-white/25">{section.detail}</p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-white/20 group-hover:text-white/45 transition" />
              </Link>
            ))}
          </div>
        </div>

        {/* Learnings section */}
        <PremiumPanel variant="subtle">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/65">Learned preferences</p>
              <p className="mt-1 text-xs text-white/35 leading-5">
                Patterns SOMA discovered from your approvals and rejections.
              </p>
            </div>
            <Link
              href="/training"
              className="flex shrink-0 items-center gap-1.5 rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/40 transition hover:border-white/12 hover:text-white/65"
            >
              View
              <ArrowRight size={12} />
            </Link>
          </div>
        </PremiumPanel>

      </div>
    </div>
  );
}
