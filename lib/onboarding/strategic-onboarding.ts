import type {
  MissionReadiness,
  OnboardingAnalysisInput,
  OnboardingAnalysisResult,
  OnboardingConfidence,
  OnboardingProfile,
  OnboardingQuestion,
  OnboardingState,
  OnboardingStatus,
} from "@/lib/onboarding/onboarding-types";
import type { ContentChannel } from "@/lib/content-types";

type LlmExtraction = {
  extracted?: Partial<OnboardingProfile>;
  summary?: string;
  missingFields?: Array<keyof OnboardingProfile>;
  nextBestQuestion?: string;
  confidence?: number;
  readyForMission?: boolean;
};

const requiredFields: Array<keyof OnboardingProfile> = [
  "businessSummary",
  "audience",
  "corePain",
  "desiredOutcome",
  "offer",
  "differentiator",
  "brandTone",
  "preferredChannels",
  "whatToBeKnownFor",
];

const questionBank: Array<OnboardingQuestion> = [
  {
    id: "business_foundation",
    field: "businessSummary",
    question: "Start by telling me what you are building, in your own words.",
  },
  {
    id: "audience",
    field: "audience",
    question: "Who do you most want this to reach first?",
  },
  {
    id: "pain",
    field: "corePain",
    question: "What painful moment should the content lead with first?",
  },
  {
    id: "outcome",
    field: "desiredOutcome",
    question: "What changes for the customer after your work has done its job?",
  },
  {
    id: "offer",
    field: "offer",
    question: "What exactly are you offering them right now?",
  },
  {
    id: "differentiator",
    field: "differentiator",
    question: "What makes your approach different from the obvious alternatives?",
  },
  {
    id: "tone",
    field: "brandTone",
    question: "What should the brand sound like when it is at its best?",
  },
  {
    id: "known_for",
    field: "whatToBeKnownFor",
    question: "What do you want people to remember you for?",
  },
  {
    id: "channels",
    field: "preferredChannels",
    question: "Which channel should matter first: LinkedIn, Instagram, Facebook, TikTok, or several at once?",
  },
  {
    id: "mission",
    field: "mission",
    question: "Is this accurate enough for me to start creating with you?",
  },
];

const channelMap: Array<[ContentChannel, RegExp]> = [
  ["linkedin", /\blinked\s?in\b/i],
  ["instagram", /\b(instagram|ig|reels?)\b/i],
  ["facebook", /\bfacebook\b/i],
  ["tiktok", /\b(tiktok|tik tok)\b/i],
];

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, limit = 220) {
  const cleaned = clean(value);
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 1).trim()}...` : cleaned;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function sentenceAfter(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1] ? clip(match[1].replace(/^(that|to|for)\s+/i, ""), 180) : undefined;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function extractChannels(message: string): ContentChannel[] | undefined {
  const channels = channelMap.filter(([, pattern]) => pattern.test(message)).map(([channel]) => channel);
  return channels.length ? channels : undefined;
}

function extractAudienceSegments(message: string): string[] | undefined {
  const segmentMatch = message.match(/\b(?:serve|help|for|audience is|customers are|clients are)\s+([^.!?\n]{8,180})/i);
  if (!segmentMatch?.[1]) return undefined;
  const raw = segmentMatch[1].split(/\s*,\s*|\s+and\s+|\s+or\s+/i).map((item) => clip(item, 70));
  const segments = unique(raw).filter((item) => item.length > 3).slice(0, 5);
  return segments.length > 1 ? segments : undefined;
}

function mergeStrings(previous?: string, next?: string) {
  if (!hasText(next)) return previous;
  if (!hasText(previous)) return clean(next!);
  const prev = clean(previous!);
  const incoming = clean(next!);
  if (prev.toLowerCase() === incoming.toLowerCase() || prev.toLowerCase().includes(incoming.toLowerCase())) {
    return prev;
  }
  if (incoming.length > prev.length + 24) return incoming;
  return prev;
}

function normalizeProfile(profile: Partial<OnboardingProfile>): Partial<OnboardingProfile> {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object" && value !== null) return true;
      return typeof value === "string" ? value.trim().length > 0 : value !== undefined;
    })
  ) as Partial<OnboardingProfile>;
}

export function heuristicExtractOnboarding(message: string, previousProfile: OnboardingProfile = {}): Partial<OnboardingProfile> {
  const source = clean(message);
  const lower = source.toLowerCase();
  const extracted: Partial<OnboardingProfile> = {};

  const nameMatch = source.match(/\b(?:called|named|brand is|business is|company is)\s+([A-Z][A-Za-z0-9&.\-\s]{1,48})/);
  if (nameMatch?.[1]) extracted.businessName = clip(nameMatch[1], 60);

  const helpMatch = source.match(/\b(?:we|i|my business|our business|the company|it)\s+(?:help|helps|serve|serves|build|builds|make|makes|sell|sells|create|creates)\s+([^.!?\n]{10,220})/i);
  if (helpMatch?.[1]) extracted.businessSummary = clip(helpMatch[1]);
  else if (!previousProfile.businessSummary && source.length > 60) extracted.businessSummary = clip(source);

  extracted.offer = sentenceAfter(source, /\b(?:offer|sell|product|service|platform|tool|program)\s+(?:is|are|helps|does|gives|for)?\s*([^.!?\n]{8,180})/i);
  extracted.audience = sentenceAfter(source, /\b(?:for|serve|serves|help|helps|audience is|customers are|clients are)\s+([^.!?\n]{8,180})/i);
  extracted.audienceSegments = extractAudienceSegments(source);
  extracted.corePain = sentenceAfter(source, /\b(?:pain|problem|struggle|frustration|wasted|stuck|manual|inconsistent|poor)\s+(?:is|are|with|around|from)?\s*([^.!?\n]{8,180})/i);
  extracted.desiredOutcome = sentenceAfter(source, /\b(?:outcome|result|promise|so they can|helps them|gives them|turns into)\s+([^.!?\n]{8,180})/i);
  extracted.differentiator = sentenceAfter(source, /\b(?:different|unlike|better than|instead of|our edge|stands out|unique)\s+([^.!?\n]{8,180})/i);
  extracted.brandTone = sentenceAfter(source, /\b(?:tone|voice|sound|feel)\s+(?:should be|is|like)?\s*([^.!?\n]{5,150})/i);
  extracted.visualDirection = sentenceAfter(source, /\b(?:visual|look|style|aesthetic|image|design)\s+(?:should be|is|like)?\s*([^.!?\n]{5,150})/i);
  extracted.ctaPreferences = sentenceAfter(source, /\b(?:cta|call to action|ask people to|invite them to)\s+([^.!?\n]{5,150})/i);
  extracted.whatToBeKnownFor = sentenceAfter(source, /\b(?:known for|remember us for|remember me for|be seen as)\s+([^.!?\n]{5,160})/i);
  extracted.preferredChannels = extractChannels(source);

  if (!extracted.brandTone && /\b(calm|direct|premium|bold|honest|minimal|human|strategic|mysterious|not corporate|no hype)\b/i.test(source)) {
    extracted.brandTone = unique(source.match(/\b(calm|direct|premium|bold|honest|minimal|human|strategic|mysterious|not corporate|no hype)\b/gi) ?? []).join(", ");
  }

  if (!extracted.corePain && /\b(save time|wasted time|manual research|poor lead quality|inconsistent pipeline|burnout)\b/i.test(lower)) {
    extracted.corePain = clip(source.match(/\b(save time|wasted time|manual research|poor lead quality|inconsistent pipeline|burnout)[^.!?\n]*/i)?.[0] ?? "");
  }

  if (!extracted.desiredOutcome && /\b(faster|more precise|better leads|predictable|confidence|clarity|pipeline)\b/i.test(lower)) {
    extracted.desiredOutcome = clip(source.match(/\b(faster|more precise|better leads|predictable|confidence|clarity|pipeline)[^.!?\n]*/i)?.[0] ?? "");
  }

  return normalizeProfile(extracted);
}

export async function extractOnboardingWithLLM(
  message: string,
  previousProfile: OnboardingProfile = {}
): Promise<LlmExtraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
  const prompt = `You are SOMA, a calm strategic apprentice. Extract onboarding understanding from the user's message.
Return JSON only with this shape:
{
  "extracted": {
    "businessName": string,
    "businessSummary": string,
    "offer": string,
    "audience": string,
    "audienceSegments": string[],
    "corePain": string,
    "desiredOutcome": string,
    "differentiator": string,
    "brandTone": string,
    "visualDirection": string,
    "preferredChannels": ["linkedin"|"facebook"|"instagram"|"tiktok"],
    "ctaPreferences": string,
    "whatToBeKnownFor": string
  },
  "summary": string,
  "missingFields": string[],
  "nextBestQuestion": string,
  "confidence": 0,
  "readyForMission": false
}
Only include extracted fields that are actually supported by the message. Ask one next question. Avoid generic questionnaire language.

Previous profile:
${JSON.stringify(previousProfile)}

User message:
${message}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Return valid JSON only. No markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    return JSON.parse(content) as LlmExtraction;
  } catch {
    return null;
  }
}

export function mergeOnboardingProfile(
  previousProfile: OnboardingProfile = {},
  newExtraction: Partial<OnboardingProfile> = {}
): OnboardingProfile {
  const previousChannels = previousProfile.preferredChannels ?? [];
  const newChannels = newExtraction.preferredChannels ?? [];

  return {
    businessName: mergeStrings(previousProfile.businessName, newExtraction.businessName),
    businessSummary: mergeStrings(previousProfile.businessSummary, newExtraction.businessSummary),
    offer: mergeStrings(previousProfile.offer, newExtraction.offer),
    audience: mergeStrings(previousProfile.audience, newExtraction.audience),
    audienceSegments: unique([...(previousProfile.audienceSegments ?? []), ...(newExtraction.audienceSegments ?? [])]),
    corePain: mergeStrings(previousProfile.corePain, newExtraction.corePain),
    desiredOutcome: mergeStrings(previousProfile.desiredOutcome, newExtraction.desiredOutcome),
    differentiator: mergeStrings(previousProfile.differentiator, newExtraction.differentiator),
    brandTone: mergeStrings(previousProfile.brandTone, newExtraction.brandTone),
    visualDirection: mergeStrings(previousProfile.visualDirection, newExtraction.visualDirection),
    preferredChannels: Array.from(new Set([...previousChannels, ...newChannels])),
    ctaPreferences: mergeStrings(previousProfile.ctaPreferences, newExtraction.ctaPreferences),
    whatToBeKnownFor: mergeStrings(previousProfile.whatToBeKnownFor, newExtraction.whatToBeKnownFor),
    missionReadiness: previousProfile.missionReadiness,
  };
}

export function detectMissingFields(profile: OnboardingProfile): Array<keyof OnboardingProfile> {
  return requiredFields.filter((field) => {
    const value = profile[field];
    return Array.isArray(value) ? value.length === 0 : !hasText(value);
  });
}

export function calculateOnboardingReadiness(profile: OnboardingProfile): MissionReadiness {
  const missing = detectMissingFields(profile);
  const answered = requiredFields.length - missing.length;
  const score = Math.round((answered / requiredFields.length) * 100);
  const essentialsPresent = Boolean(profile.businessSummary && profile.audience && profile.corePain && profile.desiredOutcome);

  return {
    ready: essentialsPresent && score >= 67,
    score,
    missing,
  };
}

function confidenceFor(score: number): OnboardingConfidence {
  if (score >= 75) return { score, label: "ready", wording: "The foundation is clear enough to create from." };
  if (score >= 52) return { score, label: "clear", wording: "The shape is becoming clear." };
  if (score >= 28) return { score, label: "forming", wording: "The outline is forming." };
  return { score, label: "early", wording: "I only have early signals." };
}

export function chooseNextBestQuestion(profile: OnboardingProfile, lastMessage = ""): OnboardingQuestion | undefined {
  const readiness = calculateOnboardingReadiness(profile);
  if (readiness.ready) return questionBank.find((question) => question.id === "mission");

  const missing = new Set(readiness.missing);
  const lastLower = lastMessage.toLowerCase();
  const priority = lastLower.length < 80
    ? ["businessSummary", "audience", "corePain", "desiredOutcome", "offer", "differentiator", "brandTone", "preferredChannels", "whatToBeKnownFor"]
    : ["corePain", "desiredOutcome", "audience", "differentiator", "brandTone", "preferredChannels", "offer", "whatToBeKnownFor", "businessSummary"];

  const field = priority.find((item) => missing.has(item as keyof OnboardingProfile));
  return questionBank.find((question) => question.field === field);
}

function statusFor(profile: OnboardingProfile, missingFields: Array<keyof OnboardingProfile>, confirmed: boolean): OnboardingStatus {
  if (confirmed) return "ready_for_mission";
  if (!Object.keys(normalizeProfile(profile)).length) return "first_contact";
  if (calculateOnboardingReadiness(profile).ready) return "confirming_profile";
  if (missingFields.length <= 4) return "clarifying";
  return "gathering_context";
}

function profileLine(label: string, value?: string | string[]) {
  if (Array.isArray(value)) return value.length ? `${label}: ${value.join(", ")}` : "";
  return value ? `${label}: ${value}` : "";
}

function buildProfileSummary(profile: OnboardingProfile, compact = false) {
  const lines = [
    profileLine("Business", profile.businessSummary),
    profileLine("Audience", profile.audience),
    profileLine("Pain", profile.corePain),
    profileLine("Promise", profile.desiredOutcome),
    profileLine("Tone", profile.brandTone),
    profileLine("Channels", profile.preferredChannels),
  ].filter(Boolean);

  if (!lines.length) return "I do not know enough yet.";
  return compact ? lines.slice(0, 6).join("\n") : lines.join("\n");
}

export function buildOnboardingResponse(state: OnboardingState): string {
  const readiness = calculateOnboardingReadiness(state.profile);
  const name = state.profile.businessName ? ` ${state.profile.businessName}` : "";

  if (state.status === "ready_for_mission" || readiness.ready) {
    return `I think I understand the foundation now.${name ? `\n\n${name.trim()} is taking shape clearly.` : ""}\n\n${buildProfileSummary(state.profile, true)}\n\nIs this accurate enough for me to start creating with you?`;
  }

  const summary = state.profile.businessSummary
    ? `It seems ${state.profile.businessSummary}.`
    : "I’m beginning to understand the shape of the business.";
  const missing = state.lastQuestion?.rationale ?? "The missing piece is the next strategic anchor.";
  const next = state.lastQuestion?.question ? `\n\nBefore I shape this, I need one thing:\n${state.lastQuestion.question}` : "";

  return `I’m starting to understand${name}.\n\n${summary}\n\n${missing}${next}`;
}

function actionsFor(state: OnboardingState, ready: boolean) {
  if (ready || state.status === "ready_for_mission") {
    return ["Confirm this understanding", "Start first mission", "Adjust this", "Add visual reference"];
  }
  return ["Answer this", "Correct this", "Confirm this understanding"];
}

export async function analyzeOnboardingMessage(input: OnboardingAnalysisInput): Promise<OnboardingAnalysisResult> {
  const previousState = input.state ?? { status: "first_contact", profile: {}, turns: [] };
  const message = clean(input.message);

  if (input.action === "start_mission") {
    const state: OnboardingState = {
      ...previousState,
      status: "ready_for_mission",
      missionBridge: { ...previousState.missionBridge },
    };
    const confidence = confidenceFor(calculateOnboardingReadiness(state.profile).score);
    return {
      state,
      response: "Good. Choose the first shape of the mission, then I’ll ask for the channel.",
      profile: state.profile,
      extracted: {},
      missingFields: detectMissingFields(state.profile),
      confidence,
      readyForMission: true,
      suggestedActions: ["Caption only", "Caption + visual", "Visual direction only", "Hook variations", "Campaign direction"],
    };
  }

  const heuristicExtraction = heuristicExtractOnboarding(message, previousState.profile);
  const llmExtraction = await extractOnboardingWithLLM(message, previousState.profile);
  const extracted = normalizeProfile({ ...heuristicExtraction, ...(llmExtraction?.extracted ?? {}) });
  const mergedWithoutReadiness = mergeOnboardingProfile(previousState.profile, extracted);
  const readiness = calculateOnboardingReadiness(mergedWithoutReadiness);
  const profile: OnboardingProfile = {
    ...mergedWithoutReadiness,
    missionReadiness: readiness,
  };
  const missingFields = detectMissingFields(profile);
  const nextQuestion = chooseNextBestQuestion(profile, message);
  const confirmed = input.action === "confirm_understanding";
  const status = confirmed ? "ready_for_mission" : statusFor(profile, missingFields, false);
  const confidence = confidenceFor(readiness.score);
  const draftState: OnboardingState = {
    ...previousState,
    status,
    profile,
    lastQuestion: nextQuestion,
    ...(confirmed ? { confirmedAt: new Date().toISOString() } : {}),
  };
  const response = llmExtraction?.summary && llmExtraction.summary.length > 20 && !readiness.ready
    ? `${llmExtraction.summary}\n\n${nextQuestion ? `Before I shape this, I need one thing:\n${nextQuestion.question}` : ""}`.trim()
    : buildOnboardingResponse(draftState);
  const turn = {
    id: `onboarding_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userMessage: message,
    somaResponse: response,
    extracted,
    missingFields,
    nextQuestion,
    confidence,
    createdAt: new Date().toISOString(),
  };
  const state: OnboardingState = {
    ...draftState,
    turns: [...previousState.turns, turn].slice(-12),
  };

  return {
    state,
    response,
    profile,
    extracted,
    missingFields,
    nextQuestion,
    confidence,
    readyForMission: readiness.ready || confirmed,
    suggestedActions: actionsFor(state, readiness.ready || confirmed),
  };
}
