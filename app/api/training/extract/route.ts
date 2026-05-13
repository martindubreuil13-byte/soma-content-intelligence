import { NextResponse } from "next/server";
import type { InjectionType } from "@/lib/training-injections";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type ExtractionResult = {
  ok: boolean;
  extractedTags: string[];
  extractedPreferences: string[];
  extractedConstraints: string[];
  extractedVisualTags: string[];
  extractedToneTags: string[];
  extractedCompositionTags: string[];
  extractedAudienceSignals: string[];
  extractedStrategicSignals: string[];
};

const IMAGE_URL_RE = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

const TYPE_INSTRUCTIONS: Record<InjectionType, string> = {
  visual_reference:
    "Extract visual style signals: what makes this image effective? Focus on composition, tone, lighting, realism level, emotional register, and what to replicate in future image generation.",
  caption_reference:
    "Extract caption writing signals: what makes this caption effective? Focus on hook structure, rhythm, tone, vocabulary choices, emotional arc, and what writing patterns to replicate.",
  content_idea:
    "Extract content angle signals: what is the core narrative or creative angle? Identify the tension, the emotional hook, the audience insight, and the operational moment being conveyed.",
  negative_training:
    "Extract what to AVOID. Identify the specific patterns, tones, phrases, visual tropes, or structural choices that should be eliminated from future generation.",
};

function pickStrings(val: unknown): string[] {
  return Array.isArray(val)
    ? (val as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
}

// ── Image URL vision analysis ────────────────────────────────────────────────

async function analyzeImageUrl(
  imageUrl: string,
  type: InjectionType,
  label: string,
  notes: string,
  apiKey: string
): Promise<ExtractionResult> {
  const model = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? "gpt-4o";
  const isNegative = type === "negative_training";

  const prompt = `Analyze this reference image for a content generation training injection.

Label: ${label || "(none)"}
Operator notes: ${notes || "(none)"}
Injection type: ${type}

${isNegative ? "Identify what to AVOID replicating from this image:" : "Extract what to LEARN and APPLY from this image:"}

Return STRICT JSON only:
{
  "extractedTags": ["up to 6 short summary tags"],
  "extractedVisualTags": ["up to 6 visual style signals"],
  "extractedCompositionTags": ["up to 4 composition signals"],
  "extractedToneTags": ["up to 4 emotional tone signals"],
  "extractedAudienceSignals": ["up to 3 audience signals"],
  "extractedPreferences": ["up to 4 actionable directives — what to DO"],
  "extractedConstraints": ["up to 4 actionable directives — what to AVOID"]
}

All items: 1-5 words, no sentences, no generic words. Return valid JSON only.`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  const result = (await response.json()) as OpenAIChatResponse;
  if (!response.ok) throw new Error(result.error?.message ?? "Vision analysis failed.");

  const raw = result.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    ok: true,
    extractedTags: pickStrings(parsed.extractedTags),
    extractedVisualTags: pickStrings(parsed.extractedVisualTags),
    extractedCompositionTags: pickStrings(parsed.extractedCompositionTags),
    extractedToneTags: pickStrings(parsed.extractedToneTags),
    extractedAudienceSignals: pickStrings(parsed.extractedAudienceSignals),
    extractedPreferences: pickStrings(parsed.extractedPreferences),
    extractedConstraints: pickStrings(parsed.extractedConstraints),
    extractedStrategicSignals: [],
  };
}

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractFromText(
  type: InjectionType,
  label: string,
  notes: string,
  sourceText: string,
  apiKey: string
): Promise<ExtractionResult> {
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
  const typeInstruction = TYPE_INSTRUCTIONS[type] ?? TYPE_INSTRUCTIONS.content_idea;

  const prompt = `You are extracting operational learning signals from a training injection for an AI content generation system.

Injection type: ${type}
Label: ${label || "(none)"}
Operator notes: ${notes || "(none)"}
Source text / reference:
${sourceText || "(none)"}

Task: ${typeInstruction}

Return STRICT JSON only:
{
  "extractedTags": ["up to 6 short 1-4 word operational tags describing the key creative signals"],
  "extractedToneTags": ["up to 4 tone/voice signals"],
  "extractedStrategicSignals": ["up to 4 content strategy signals"],
  "extractedAudienceSignals": ["up to 3 audience signals"],
  "extractedPreferences": ["up to 4 short positive directives — what the system SHOULD do based on this"],
  "extractedConstraints": ["up to 4 short negative directives — what the system MUST AVOID based on this"]
}

Rules:
- All items must be concise operational phrases (1-5 words max each).
- No full sentences, no generic words like "good", "effective", "improve".
- extractedTags: descriptive signal labels (e.g. "quiet confidence", "late night framing", "hook-first structure").
- extractedPreferences: actionable directives to reinforce (e.g. "use candid posture", "open with tension", "stay understated").
- extractedConstraints: actionable things to avoid (e.g. "no motivational clichés", "avoid polished studio look", "no corporate cadence").
- Return valid JSON only. No markdown, no commentary.`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const result = (await response.json()) as OpenAIChatResponse;
  if (!response.ok) throw new Error(result.error?.message ?? "OpenAI extraction failed.");

  const raw = result.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    ok: true,
    extractedTags: pickStrings(parsed.extractedTags),
    extractedToneTags: pickStrings(parsed.extractedToneTags),
    extractedStrategicSignals: pickStrings(parsed.extractedStrategicSignals),
    extractedAudienceSignals: pickStrings(parsed.extractedAudienceSignals),
    extractedPreferences: pickStrings(parsed.extractedPreferences),
    extractedConstraints: pickStrings(parsed.extractedConstraints),
    extractedVisualTags: [],
    extractedCompositionTags: [],
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const type = (body.type as InjectionType) ?? "content_idea";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  const referenceUrl = typeof body.referenceUrl === "string" ? body.referenceUrl.trim() : "";

  // Image URL → vision analysis
  if (referenceUrl && IMAGE_URL_RE.test(referenceUrl)) {
    try {
      const result = await analyzeImageUrl(referenceUrl, type, label, notes, apiKey);
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Vision analysis failed." },
        { status: 500 }
      );
    }
  }

  if (!sourceText && !notes) {
    return NextResponse.json(
      { error: "sourceText, notes, or a referenceUrl pointing to an image is required." },
      { status: 400 }
    );
  }

  try {
    const result = await extractFromText(type, label, notes, sourceText, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed." },
      { status: 500 }
    );
  }
}
