import type {
  OnboardingConfidence,
  OnboardingProfile,
  OnboardingQuestion,
  OnboardingState,
  OnboardingStatus,
} from "@/lib/onboarding/onboarding-types";

type MissionState = NonNullable<OnboardingState["missionBridge"]>;

const openings = [
  "I’m starting to see the shape.",
  "The direction is beginning to make sense.",
  "A clearer picture is forming.",
  "I’m beginning to understand the strategic core.",
];

const uncertaintyPhrases = [
  "The part I still need to understand is",
  "What I don’t want to assume yet is",
  "The missing piece is",
  "Before I create from this, I need to clarify",
];

const correctionPhrases = [
  "Got it. I’ve adjusted that.",
  "That helps. I’ll treat that correction as stronger than my earlier guess.",
  "Understood. I’ll update the picture.",
];

const readinessPhrases = [
  "I have enough to create a first draft with you.",
  "This is enough for a first direction. I’ll still learn from your reaction.",
  "I can begin with this, carefully, and improve it as you respond.",
];

const nextQuestionIntros = [
  "The question I’d ask next is:",
  "One thing would sharpen this:",
  "Before I shape the first direction, I’d ask:",
  "To avoid guessing, I need one answer:",
];

const missionBridgeIntros = [
  "Good. Let’s decide the first move.",
  "Good. Now we can choose the first creative step.",
  "Good. Let’s turn this into a small first attempt.",
];

function pick<T>(items: T[], seed = 0) {
  return items[Math.abs(seed) % items.length];
}

function compact(value?: string) {
  return value?.replace(/\s+/g, " ").trim();
}

function joinSentence(parts: string[]) {
  return parts.filter(Boolean).join(" ");
}

function turnSeed(status?: OnboardingStatus, turnCount = 0) {
  return turnCount + (status ? status.length : 0);
}

export function buildNarrativeSummary(
  profile: OnboardingProfile,
  confidence: OnboardingConfidence,
  status: OnboardingStatus = "gathering_context",
  turnCount = 0
) {
  const seed = turnSeed(status, turnCount);
  const opening = confidence.label === "ready" ? pick(readinessPhrases, seed) : pick(openings, seed);
  const business = compact(profile.businessSummary);
  const audience = compact(profile.audience);
  const pain = compact(profile.corePain);
  const outcome = compact(profile.desiredOutcome);
  const difference = compact(profile.differentiator);
  const tone = compact(profile.brandTone);
  const body = business
    ? joinSentence([
        `I’m reading this as ${business}`,
        audience ? `for ${audience}` : "",
        pain ? `where the pressure is ${pain}` : "",
        outcome ? `and the desired change is ${outcome}` : "",
      ])
    : "I only have the first outline, so I’m still holding this lightly.";
  const signal = pain
    ? `The strongest signal so far is the tension around ${pain}.`
    : outcome
      ? `The strongest signal so far is the movement toward ${outcome}.`
      : tone
        ? `The strongest signal so far is the voice: ${tone}.`
        : "";
  const contrast = difference ? `What may make this distinct is ${difference}.` : "";

  return [opening, body, signal, contrast].filter(Boolean).join("\n\n");
}

export function buildNaturalUncertainty(
  profile: OnboardingProfile,
  missingFields: Array<keyof OnboardingProfile>,
  needsCorrection = false,
  turnCount = 0
) {
  if (needsCorrection) {
    return "I may be blending two ideas together, so I’d rather slow down than create from a messy assumption.";
  }

  const phrase = pick(uncertaintyPhrases, turnCount);
  const missing = missingFields[0];

  if (!missing) return "";
  if (missing === "audience") return `${phrase} who this should reach first.`;
  if (missing === "corePain") return `${phrase} the specific struggle to lead with.`;
  if (missing === "desiredOutcome") return `${phrase} the change people should expect after this works.`;
  if (missing === "offer") return `${phrase} what someone can actually buy, use, or request.`;
  if (missing === "differentiator") return `${phrase} why this wins against the obvious alternatives.`;
  if (missing === "brandTone") return `${phrase} how this should sound when it is at its best.`;
  if (missing === "preferredChannels") return `${phrase} where this should live first.`;
  if (missing === "whatToBeKnownFor") return `${phrase} what you want to be remembered for.`;

  return `${phrase} the next strategic anchor.`;
}

export function buildNextQuestionIntro(
  nextQuestion?: OnboardingQuestion,
  status: OnboardingStatus = "gathering_context",
  turnCount = 0
) {
  if (!nextQuestion?.question) return "";
  return `${pick(nextQuestionIntros, turnSeed(status, turnCount))}\n${nextQuestion.question}`;
}

export function buildCorrectionNarrative(
  profile: OnboardingProfile,
  correctedFields: Array<keyof OnboardingProfile>,
  nextQuestion?: OnboardingQuestion,
  status: OnboardingStatus = "clarifying",
  turnCount = 0
) {
  const corrected = correctedFields
    .map((field) => {
      const value = profile[field];
      if (Array.isArray(value)) return value.length ? value.join(", ") : "";
      return typeof value === "string" ? value : "";
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const acknowledgement = pick(correctionPhrases, turnSeed(status, turnCount));
  const question = buildNextQuestionIntro(nextQuestion, status, turnCount);

  return [
    acknowledgement,
    corrected ? `The corrected picture is: ${corrected}` : "I’ll treat your correction as the stronger signal going forward.",
    question,
  ].filter(Boolean).join("\n\n");
}

export function buildReadinessNarrative(profile: OnboardingProfile, confidence: OnboardingConfidence, turnCount = 0) {
  return [
    pick(readinessPhrases, turnCount),
    buildNarrativeSummary(profile, confidence, "confirming_profile", turnCount).split("\n\n").slice(1).join("\n\n"),
    "Do you want me to create something from this?",
  ].filter(Boolean).join("\n\n");
}

export function buildMissionBridgeNarrative(
  profile: OnboardingProfile,
  missionState: MissionState = {},
  visualReferenceCount = 0,
  attachedAssetName?: string
) {
  const intro = pick(missionBridgeIntros, `${missionState.missionType ?? ""}${missionState.channel ?? ""}`.length);
  const type = missionState.missionType;
  const channel = missionState.channel;
  const mission =
    type === "caption_only" ? "write the post first" :
    type === "caption_visual" ? "create the post and visual direction together" :
    type === "visual_direction" ? "explore the visual direction first" :
    type === "hook_variations" ? "give you hook variations" :
    type === "campaign_direction" ? "shape the campaign angle first" :
    "choose the first creative move";
  const place = channel === "multi" ? "across channels" : channel ? `on ${channel.charAt(0).toUpperCase()}${channel.slice(1)}` : "where it should live first";
  const visualLine = type === "caption_visual" || type === "visual_direction"
    ? attachedAssetName
      ? `I’ll ground the visual thinking in ${attachedAssetName}.`
      : visualReferenceCount > 0
        ? "I can use the visual memory you’ve already shown me."
        : "I don’t have much visual memory yet, so you can show me a reference or let me explore freely."
    : "";
  const context = profile.businessSummary ? `I’ll keep the first attempt tied to ${profile.businessSummary}.` : "";

  return [intro, `I’ll ${mission} ${place}.`, visualLine, context].filter(Boolean).join("\n\n");
}
