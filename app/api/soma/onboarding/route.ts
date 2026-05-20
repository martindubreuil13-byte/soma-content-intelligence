import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";
import { successResponse, validationError, internalServerError } from "@/lib/http/api-response";
import { writeBrandCore, saveICP } from "@/lib/brand-intelligence";
import { analyzeOnboardingMessage } from "@/lib/onboarding/strategic-onboarding";
import type { OnboardingAnalysisInput, OnboardingProfile, OnboardingState } from "@/lib/onboarding/onboarding-types";

export const dynamic = "force-dynamic";

type RequestBody = {
  message?: unknown;
  state?: unknown;
  action?: unknown;
  missionType?: unknown;
  channel?: unknown;
  referenceChoice?: unknown;
};

function isState(value: unknown): value is OnboardingState {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stateFrom(value: unknown): OnboardingState | undefined {
  if (!isState(value)) return undefined;
  const record = value as Partial<OnboardingState>;
  return {
    status: record.status ?? "first_contact",
    profile: record.profile ?? {},
    turns: Array.isArray(record.turns) ? record.turns : [],
    lastQuestion: record.lastQuestion,
    confirmedAt: record.confirmedAt,
    missionBridge: record.missionBridge,
  };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "profile";
}

async function persistDraft({
  message,
  result,
}: {
  message: string;
  result: Awaited<ReturnType<typeof analyzeOnboardingMessage>>;
}) {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();

  const { error: memoryError } = await supabase.from("preference_memories").upsert(
    {
      organization_id: context.organization.id,
      category: "onboarding_profile_draft",
      key: "current",
      value: result.profile,
      weight: result.confidence.score,
      metadata: {
        status: result.state.status,
        ready_for_mission: result.readyForMission,
        missing_fields: result.missingFields,
        updated_at: now,
      },
    },
    { onConflict: "organization_id,category,key" }
  );
  if (memoryError) throw memoryError;

  const { error: eventError } = await supabase.from("learning_events").insert({
    organization_id: context.organization.id,
    event_type: "onboarding_turn",
    target_type: "onboarding_profile",
    tags: ["onboarding", result.state.status],
    notes: result.response.slice(0, 600),
    metadata: {
      message_excerpt: message.slice(0, 900),
      extracted: result.extracted,
      profile: result.profile,
      missing_fields: result.missingFields,
      next_question: result.nextQuestion,
      confidence: result.confidence,
    },
  });
  if (eventError) throw eventError;
}

async function persistConfirmedFoundation(profile: OnboardingProfile) {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const brandName = profile.businessName ?? "ALPA";

  await writeBrandCore({
    brandName,
    positioning: profile.businessSummary ?? profile.offer ?? "",
    toneDescriptors: profile.brandTone ? profile.brandTone.split(/,\s*|\s+and\s+/i).map((item) => item.trim()).filter(Boolean) : [],
    communicationStyle: profile.brandTone ?? "",
    valueProposition: profile.desiredOutcome ?? "",
    ctaPhilosophy: profile.ctaPreferences ?? "",
    messagingConstraints: [
      profile.differentiator ? `Differentiator: ${profile.differentiator}` : "",
      profile.whatToBeKnownFor ? `Known for: ${profile.whatToBeKnownFor}` : "",
      profile.visualDirection ? `Visual direction: ${profile.visualDirection}` : "",
    ].filter(Boolean),
  });

  if (profile.audience) {
    await saveICP({
      id: "",
      label: profile.audienceSegments?.[0] ?? profile.audience.slice(0, 60),
      description: profile.audience,
      painPoints: profile.corePain ? [profile.corePain] : [],
      frustrations: profile.corePain ? [profile.corePain] : [],
      aspirations: profile.desiredOutcome ? [profile.desiredOutcome] : [],
      desiredOutcomes: profile.desiredOutcome ? [profile.desiredOutcome] : [],
      emotionalTriggers: [],
      platforms: profile.preferredChannels ?? [],
      isActive: true,
    });
  }

  const { error: memoryError } = await supabase.from("preference_memories").upsert(
    {
      organization_id: context.organization.id,
      category: "confirmed_onboarding_foundation",
      key: slug(brandName),
      value: profile,
      weight: 100,
      metadata: {
        confirmed_at: now,
        source: "soma_guided_onboarding",
      },
    },
    { onConflict: "organization_id,category,key" }
  );
  if (memoryError) throw memoryError;

  const { error: eventError } = await supabase.from("learning_events").insert({
    organization_id: context.organization.id,
    event_type: "onboarding_profile_confirmed",
    target_type: "onboarding_profile",
    tags: ["onboarding", "confirmed"],
    notes: "User confirmed SOMA onboarding foundation.",
    metadata: { profile },
  });
  if (eventError) throw eventError;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const action = typeof body.action === "string" ? body.action : "message";

    if (!message && action === "message") return validationError("Tell SOMA something first.");

    const input: OnboardingAnalysisInput = {
      message,
      state: stateFrom(body.state),
      action: action as OnboardingAnalysisInput["action"],
      missionType: typeof body.missionType === "string" ? body.missionType as OnboardingAnalysisInput["missionType"] : undefined,
      channel: typeof body.channel === "string" ? body.channel as OnboardingAnalysisInput["channel"] : undefined,
      referenceChoice: typeof body.referenceChoice === "string" ? body.referenceChoice as OnboardingAnalysisInput["referenceChoice"] : undefined,
    };
    const result = await analyzeOnboardingMessage(input);

    await persistDraft({ message, result }).catch((error) => {
      console.error("[soma/onboarding] draft persistence failed", error instanceof Error ? error.message : error);
    });

    if (action === "confirm_understanding") {
      await persistConfirmedFoundation(result.profile).catch((error) => {
        console.error("[soma/onboarding] confirmed persistence failed", error instanceof Error ? error.message : error);
      });
    }

    return successResponse({
      state: result.state,
      response: result.response,
      profile: result.profile,
      extracted: result.extracted,
      missingFields: result.missingFields,
      nextQuestion: result.nextQuestion,
      confidence: result.confidence,
      readyForMission: result.readyForMission,
      suggestedActions: result.suggestedActions,
    });
  } catch (error) {
    return internalServerError(error);
  }
}
