import { getAgentTrainingSummary } from "@/lib/agent-training";
import { listExecutionJobs } from "@/lib/db/execution-jobs-db";
import { listOrganizationAssets } from "@/lib/db/organization-assets-db";
import { listPreferenceMemories } from "@/lib/db/intelligence-db";
import { getSomaTruthState, isFirstContactState } from "@/lib/db/soma-truth-state-db";
import { getContentRuns } from "@/lib/output-runs";
import { readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel, ContentRun } from "@/lib/content-types";
import { TodayInteraction } from "@/components/soma/today-interaction";
import { ContextDrawer } from "@/components/soma/context-drawer";
import type { OrbState } from "@/components/soma/agent-orb";
import type { PreparedRun, DrawerSummary } from "@/components/soma/context-drawer";
import type { OnboardingProfile } from "@/lib/onboarding/onboarding-types";

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
  const imageApproved  = all.filter((p) => p.feedback.image.status === "approved").length;
  const anyPending     = all.some((p) => p.feedback.caption.status === "pending");
  if (captionApproved === channelList.length && imageApproved === channelList.length)
    return { label: "Ready",        color: "emerald" as const };
  if (anyPending) return { label: "Needs review", color: "violet"  as const };
  if (captionApproved > 0 || imageApproved > 0)
    return { label: "In review",    color: "amber"   as const };
  return { label: "Draft", color: "neutral" as const };
}

type SomaSpeech = {
  headline: string;
  body: string;
  primaryLabel: string;
  composerPlaceholder: string;
  suggestions: string[];
};

function getSomaSpeech(score: number, runsCount: number, pending: number, isFirstContact: boolean): SomaSpeech {
  if (runsCount === 0) {
    if (!isFirstContact) {
      return {
        headline: "I'm starting to understand.",
        body: "I have early signals, but no directions created yet. Give me a brief or teach me what to notice next.",
        primaryLabel: "Talk to SOMA",
        composerPlaceholder: "Share a brief, a reference, or a sharper rule for SOMA to remember.",
        suggestions: [
          "Create the first direction from this idea",
          "Here is another reference to learn from",
          "This is the tone I want",
        ],
      };
    }

    return {
      headline: "I don't know your business yet.",
      body: "Start by telling me what you're building. I learn through interaction, references, and feedback.",
      primaryLabel: "Teach SOMA",
      composerPlaceholder: "What are you building? Who is it for? What should SOMA notice first?",
      suggestions: [
        "Let me tell you what I'm building",
        "This is who I serve",
        "Teach me how you think",
        "Here is a reference I want you to observe",
        "Help me define the first direction",
      ],
    };
  }

  if (pending > 0 && score >= 30) {
    return {
      headline: pending === 1 ? "One direction is waiting." : "There are directions to review.",
      body: "There is work waiting for your review. Your reaction is how I keep improving.",
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const [runs, queue, jobs, truthState, memories, visualReferences] = await Promise.all([
    getContentRuns({ includeLegacyFallback: false }),
    readPublishingQueue(),
    listExecutionJobs({ limit: 4 }).catch(() => []),
    getSomaTruthState(),
    listPreferenceMemories().catch(() => []),
    listOrganizationAssets({ assetType: "visual_reference", isActive: true }).catch(() => []),
  ]);
  const summary = await getAgentTrainingSummary(runs);
  const isFirstContact = isFirstContactState(truthState);

  const queueCount    = queue.filter((q) => q.status === "approved").length;
  const pendingRuns   = runs.filter((r) => getRunStatus(r).color === "violet").length;
  const speech        = getSomaSpeech(summary.score, runs.length, pendingRuns, isFirstContact);
  const orbState      = getOrbState(summary.score, runs.length, pendingRuns);
  const maturityLevel = getMaturityLevel(summary.score);

  const secondaryLabel =
    pendingRuns > 0
      ? pendingRuns === 1
        ? "Review pending draft"
        : `Review ${pendingRuns} pending drafts`
      : undefined;

  const secondaryHref =
    pendingRuns > 0 ? "/review" : undefined;

  // Pre-transform for context drawer (crosses server→client boundary)
  const preparedRuns: PreparedRun[] = runs.map((run) => {
    const status  = getRunStatus(run);
    const preview =
      (run.hasOriginalIdea ? run.originalIdea : run.channels.linkedin?.caption ?? "Generated content")
        ?.slice(0, 82)?.replace(/\n/g, " ") ?? "";
    return { id: run.id, preview, statusLabel: status.label, statusColor: status.color };
  });

  const drawerSummary: DrawerSummary = {
    score:             summary.score,
    stage:             summary.stage,
    stageDescription:  summary.stageDescription,
    evaluatedSamples:  summary.evaluatedSamples,
    approved:          summary.approved,
  };

  const activeJobCount = jobs.filter((j) => j.status === "running").length;
  const onboardingDraft = memories.find((memory) => memory.category === "onboarding_profile_draft" && memory.key === "current")?.value as OnboardingProfile | undefined;

  return (
    <div className="min-h-screen px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[700px]">

        {/* Presence + interaction — fully client-driven */}
        <TodayInteraction
          headline={speech.headline}
          body={speech.body}
          initialOrbState={orbState}
          maturityLevel={maturityLevel}
          primaryLabel={speech.primaryLabel}
          suggestions={speech.suggestions}
          placeholder={speech.composerPlaceholder}
          secondaryLabel={secondaryLabel}
          secondaryHref={secondaryHref}
          isFirstContact={runs.length === 0}
          visualReferenceCount={visualReferences.length}
        />

        {/* Context drawer (trigger + panel) */}
        <ContextDrawer
          summary={drawerSummary}
          preparedRuns={preparedRuns}
          queueCount={queueCount}
          activeJobCount={activeJobCount}
          isFirstContact={isFirstContact}
          onboardingDraft={onboardingDraft}
          visualReferenceCount={visualReferences.length}
        />

      </div>
    </div>
  );
}
