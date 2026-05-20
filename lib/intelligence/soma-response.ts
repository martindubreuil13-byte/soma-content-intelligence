import type { ConversationExtraction } from "@/lib/intelligence/conversation-extraction";

export type SomaInterpretedResponse = {
  headline: string;
  body: string;
  memoryLine: string;
};

export function createSomaResponse(extraction: ConversationExtraction): SomaInterpretedResponse {
  const topSignals = extraction.extractedSignals.slice(0, 2).map((signal) => signal.value.toLowerCase());
  const signalPhrase = topSignals.length ? topSignals.join(" and ") : "a clearer strategic direction";

  if (extraction.detectedIntent === "business_context") {
    return {
      headline: "I’m beginning to understand your direction.",
      body: `This sounds like a positioning strategy centered around ${signalPhrase}. I’ll keep treating your business context as memory, not just a prompt.`,
      memoryLine: "Added to SOMA’s understanding.",
    };
  }

  if (extraction.detectedIntent === "visual_reference") {
    return {
      headline: "Your references are shaping my visual taste.",
      body: `I’m reading this as a preference for ${signalPhrase}. That helps me choose images with better restraint and atmosphere later.`,
      memoryLine: "SOMA remembered this visual signal.",
    };
  }

  if (extraction.detectedIntent === "tone_direction") {
    return {
      headline: "I’m hearing your voice more clearly.",
      body: `You seem to prefer messaging that feels ${signalPhrase}. I’ll use that as a guardrail against generic or overly polished language.`,
      memoryLine: "SOMA remembered this tone preference.",
    };
  }

  if (extraction.detectedIntent === "audience_definition") {
    return {
      headline: "Your audience is becoming clearer.",
      body: `This helps me write toward a real person, not an abstract market. The useful signal here is ${signalPhrase}.`,
      memoryLine: "SOMA added this audience signal.",
    };
  }

  if (extraction.detectedIntent === "content_mission") {
    return {
      headline: "I can turn this into a direction.",
      body: `There’s a content idea here, but also a memory signal around ${signalPhrase}. I’ll keep both in view before creating.`,
      memoryLine: "SOMA remembered the strategic signal.",
    };
  }

  return {
    headline: "I found something useful here.",
    body: extraction.conversationalSummary,
    memoryLine: "SOMA remembered this.",
  };
}
