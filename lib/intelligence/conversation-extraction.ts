export type ConversationSignalKind =
  | "business_summary"
  | "audience"
  | "transformation"
  | "tone"
  | "visual_style"
  | "positioning"
  | "cta"
  | "emotional_theme"
  | "brand_aspiration"
  | "content_goal"
  | "reference";

export type ExtractedSignal = {
  kind: ConversationSignalKind;
  label: string;
  value: string;
  confidence: number;
};

export type ConversationExtraction = {
  detectedIntent: "business_context" | "audience_definition" | "visual_reference" | "tone_direction" | "content_mission" | "general_memory";
  confidence: number;
  extractedSignals: ExtractedSignal[];
  conversationalSummary: string;
  suggestedActions: string[];
};

const signalRules: Array<{
  kind: ConversationSignalKind;
  label: string;
  keywords: string[];
  value: string;
}> = [
  { kind: "audience", label: "Audience", value: "Specific buyer or community", keywords: ["restaurant", "founder", "owner", "coach", "agency", "creator", "operator", "customer", "client", "audience", "serve"] },
  { kind: "transformation", label: "Transformation", value: "Before-and-after change", keywords: ["transform", "save time", "clarity", "growth", "simplify", "automate", "replace", "avoid", "stop", "solve"] },
  { kind: "tone", label: "Tone", value: "Direct and grounded", keywords: ["direct", "calm", "bold", "premium", "honest", "simple", "human", "not corporate", "no hype", "minimal"] },
  { kind: "visual_style", label: "Style", value: "Cinematic minimal visual direction", keywords: ["cinematic", "visual", "image", "photo", "minimal", "dark", "clean", "editorial", "reference", "screenshot", "logo"] },
  { kind: "positioning", label: "Positioning", value: "Strategic differentiation", keywords: ["position", "known for", "different", "category", "authority", "premium", "strategy", "brand"] },
  { kind: "cta", label: "CTA", value: "Soft conversion signal", keywords: ["book", "call", "demo", "subscribe", "join", "message", "contact", "download", "cta"] },
  { kind: "emotional_theme", label: "Emotion", value: "Relief, confidence, or momentum", keywords: ["relief", "trust", "confidence", "frustrated", "overwhelmed", "stuck", "momentum", "aspire", "feel"] },
  { kind: "content_goal", label: "Goal", value: "Content direction", keywords: ["post", "campaign", "content", "caption", "launch", "announce", "write", "draft", "ideas"] },
  { kind: "reference", label: "Reference", value: "Example or inspiration", keywords: ["like", "love", "example", "reference", "similar", "inspired", "link", "style"] },
];

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, limit = 110) {
  const cleaned = clean(value);
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 1).trim()}...` : cleaned;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferIntent(text: string, signals: ExtractedSignal[]): ConversationExtraction["detectedIntent"] {
  const kinds = new Set(signals.map((signal) => signal.kind));
  if (kinds.has("content_goal")) return "content_mission";
  if (kinds.has("visual_style") || kinds.has("reference")) return "visual_reference";
  if (kinds.has("audience")) return "audience_definition";
  if (kinds.has("tone")) return "tone_direction";
  if (/\b(we|i|my|our)\s+(help|serve|sell|build|run|make|do)\b/.test(text)) return "business_context";
  return "general_memory";
}

function inferBusinessSummary(input: string): ExtractedSignal | null {
  const match = input.match(/\b(?:we|i|my company|our company|my business|our business)\s+(?:help|serve|sell|build|make|run|do|create)\s+([^.!?\n]{8,150})/i);
  if (!match?.[1]) return null;
  return {
    kind: "business_summary",
    label: "Business",
    value: clip(match[1], 90),
    confidence: 0.76,
  };
}

function summaryFor(intent: ConversationExtraction["detectedIntent"], signals: ExtractedSignal[]) {
  const signalText = signals.slice(0, 3).map((signal) => signal.value.toLowerCase()).join(", ");

  if (intent === "business_context") return `I’m beginning to understand the shape of your business. The strongest signal is around ${signalText || "positioning and context"}.`;
  if (intent === "audience_definition") return "This gives me a clearer picture of who you want to reach. I’ll treat the audience signal as a strategic anchor, not just a demographic.";
  if (intent === "visual_reference") return "Your references are starting to define a visual taste boundary. I’m reading this as direction for atmosphere, restraint, and what not to over-explain.";
  if (intent === "tone_direction") return "You seem to prefer a voice with a clear point of view. I’ll remember this as a tone preference, not a one-off instruction.";
  if (intent === "content_mission") return "This sounds like something we can turn into content, but it also teaches me what kind of strategic direction matters to you.";
  return "I found a few useful signals here. They’re small, but they help me understand how your business should sound, feel, and move.";
}

function actionsFor(intent: ConversationExtraction["detectedIntent"]) {
  if (intent === "business_context") return ["Teach SOMA visually", "Define your audience deeper", "Create first direction"];
  if (intent === "visual_reference") return ["Generate a visual direction", "Extract brand emotion", "Upload a matching reference"];
  if (intent === "content_mission") return ["Draft three approaches", "Explore alternate positioning", "Create a mission"];
  if (intent === "audience_definition") return ["Name the buyer tension", "Define the desired transformation", "Create audience-specific content"];
  if (intent === "tone_direction") return ["Save as voice memory", "Show examples you like", "Define what to avoid"];
  return ["Teach SOMA more", "Add a visual reference", "Turn this into a direction"];
}

export function extractConversationIntelligence(input: string, reference?: string): ConversationExtraction {
  const source = clean([input, reference].filter(Boolean).join(" "));
  const lower = source.toLowerCase();
  const signals: ExtractedSignal[] = [];
  const business = inferBusinessSummary(source);

  if (business) signals.push(business);

  signalRules.forEach((rule) => {
    if (includesAny(lower, rule.keywords)) {
      signals.push({
        kind: rule.kind,
        label: rule.label,
        value: rule.value,
        confidence: 0.62 + Math.min(0.25, rule.keywords.filter((keyword) => lower.includes(keyword)).length * 0.05),
      });
    }
  });

  if (reference && !signals.some((signal) => signal.kind === "reference")) {
    signals.push({ kind: "reference", label: "Reference", value: "External example or inspiration", confidence: 0.72 });
  }

  const uniqueSignals = signals.filter((signal, index, all) => all.findIndex((item) => item.kind === signal.kind && item.label === signal.label) === index);
  const detectedIntent = inferIntent(lower, uniqueSignals);
  const confidence = uniqueSignals.length ? Math.min(0.94, 0.45 + uniqueSignals.length * 0.08) : 0.34;

  return {
    detectedIntent,
    confidence,
    extractedSignals: uniqueSignals.slice(0, 8),
    conversationalSummary: summaryFor(detectedIntent, uniqueSignals),
    suggestedActions: actionsFor(detectedIntent),
  };
}
