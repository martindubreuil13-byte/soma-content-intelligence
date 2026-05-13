import { NextResponse } from "next/server";
import type { InjectionType } from "@/lib/training-injections";

export const maxDuration = 60;

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type AnalysisResult = {
  ok: boolean;
  extractedTags: string[];
  extractedPreferences: string[];
  extractedConstraints: string[];
  extractedVisualTags: string[];
  extractedToneTags: string[];
  extractedCompositionTags: string[];
  extractedAudienceSignals: string[];
  extractedStrategicSignals: string[];
  extractedText?: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const PDF_TYPE = "application/pdf";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PDF_BYTES = 20 * 1024 * 1024;   // 20MB

function pickStrings(val: unknown): string[] {
  return Array.isArray(val)
    ? (val as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
}

// ── Image analysis via GPT vision ────────────────────────────────────────────

async function analyzeImage(
  base64: string,
  mimeType: string,
  label: string,
  notes: string,
  injectionType: InjectionType,
  apiKey: string
): Promise<AnalysisResult> {
  const isNegative = injectionType === "negative_training";
  const model = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? "gpt-4o";

  const systemPrompt = isNegative
    ? `You are analyzing a visual reference to identify patterns the AI content generation system should NEVER replicate. Extract specific patterns, tropes, aesthetics, and choices that should be avoided.`
    : `You are analyzing a visual reference to extract reusable creative intelligence for an AI content generation system that produces social media content for a B2B SaaS product. Extract specific, operational, reusable creative signals.`;

  const userPrompt = `Analyze this reference image for a content generation training injection.

Label: ${label || "(none)"}
Operator notes: ${notes || "(none)"}
Injection type: ${injectionType}

${isNegative ? "Identify what to AVOID replicating from this image:" : "Extract what to LEARN and APPLY from this image:"}

Return STRICT JSON only:
{
  "extractedTags": ["up to 6 short summary tags describing the key creative signals"],
  "extractedVisualTags": ["up to 6 visual style signals: lighting, color tone, texture, aesthetic, realism level"],
  "extractedCompositionTags": ["up to 4 composition signals: framing, focal point, negative space, layout balance"],
  "extractedToneTags": ["up to 4 emotional tone signals: mood, energy, warmth, tension"],
  "extractedAudienceSignals": ["up to 3 perceived audience signals: who this is for, their mindset, their world"],
  "extractedPreferences": ["up to 4 short actionable directives — what the system SHOULD do"],
  "extractedConstraints": ["up to 4 short actionable directives — what to AVOID"]
}

Rules:
- All items must be 1-5 words max. No sentences. No generic words.
- extractedTags: short label summary for display (e.g. "cinematic realism", "documentary framing")
- extractedVisualTags: visual style signals (e.g. "soft diffused light", "muted earthy palette", "grainy film texture")
- extractedCompositionTags: layout/framing (e.g. "centered subject", "negative space right", "wide environmental frame")
- extractedToneTags: mood/emotional register (e.g. "quiet fatigue", "understated confidence", "restrained tension")
- extractedAudienceSignals: who the image speaks to (e.g. "independent operator", "late-night worker", "mobile-first professional")
- extractedPreferences: what to replicate (e.g. "use candid posture", "prefer window light", "avoid staged setup")
- extractedConstraints: what to avoid (e.g. "no studio lighting", "avoid polished perfection", "no motivational energy")
- Return valid JSON only. No markdown fences. No commentary.`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
            { type: "text", text: userPrompt },
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

// ── PDF analysis via text extraction + GPT ───────────────────────────────────

async function analyzePdf(
  buffer: Buffer,
  label: string,
  notes: string,
  injectionType: InjectionType,
  keepOriginal: boolean,
  apiKey: string
): Promise<AnalysisResult> {
  // Dynamic import keeps pdf-parse + pdfjs-dist out of the Next.js bundle (serverExternalPackages)
  const { PDFParse } = (await import("pdf-parse")) as {
    PDFParse: new (opts: { data: Uint8Array }) => { getText(): Promise<{ text: string }> };
  };

  let extractedText = "";
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    extractedText = result.text.trim().slice(0, 12000);
  } catch (err) {
    throw new Error(`PDF text extraction failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  if (!extractedText) throw new Error("Could not extract text from this PDF.");

  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
  const isNegative = injectionType === "negative_training";

  const prompt = `You are extracting operational learning signals from a document for an AI content generation system.

Label: ${label || "(none)"}
Operator notes: ${notes || "(none)"}
Injection type: ${injectionType}

Document content (truncated to 12000 chars):
${extractedText}

${isNegative ? "Identify what patterns to AVOID based on this document:" : "Extract what to LEARN and APPLY from this document:"}

Return STRICT JSON only:
{
  "extractedTags": ["up to 6 short summary tags describing key signals"],
  "extractedToneTags": ["up to 5 tone/voice signals: sophistication level, communication style, energy, authority"],
  "extractedStrategicSignals": ["up to 5 strategic content patterns: persuasion style, story structure, data density, CTA approach"],
  "extractedAudienceSignals": ["up to 3 audience signals: who it speaks to, their mindset, sophistication level"],
  "extractedPreferences": ["up to 4 short actionable directives — what the system SHOULD do"],
  "extractedConstraints": ["up to 4 short actionable directives — what to AVOID"]
}

Rules:
- All items must be 1-5 words max. No sentences. No generic words like "good" or "effective".
- extractedTags: display summary (e.g. "confident editorial tone", "data-light narrative")
- extractedToneTags: voice/tone (e.g. "restrained authority", "peer-level directness", "no jargon")
- extractedStrategicSignals: structural patterns (e.g. "tension before resolution", "problem-first structure", "social proof light")
- extractedAudienceSignals: who it's for (e.g. "senior operators", "time-pressured founders", "skeptical buyers")
- extractedPreferences: actionable reinforce (e.g. "open with operational tension", "use peer-level voice")
- extractedConstraints: actionable avoid (e.g. "no corporate jargon", "avoid feature list structure")
- Return valid JSON only. No markdown. No commentary.`.trim();

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
  if (!response.ok) throw new Error(result.error?.message ?? "PDF analysis failed.");

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
    extractedText: keepOriginal ? extractedText.slice(0, 3000) : undefined,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const type = ((formData.get("type") as string) ?? "content_idea") as InjectionType;
  const label = ((formData.get("label") as string) ?? "").trim();
  const notes = ((formData.get("notes") as string) ?? "").trim();
  const keepOriginal = formData.get("keepOriginal") === "true";

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const mimeType = file.type.toLowerCase();
  const isImage = IMAGE_TYPES.has(mimeType);
  const isPdf = mimeType === PDF_TYPE;

  if (!isImage && !isPdf) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}. Accepted: jpg, png, webp, pdf.` },
      { status: 400 }
    );
  }

  const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(maxBytes / 1024 / 1024)}MB for ${isPdf ? "PDFs" : "images"}.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let result: AnalysisResult;

    if (isImage) {
      result = await analyzeImage(buffer.toString("base64"), mimeType, label, notes, type, apiKey);
    } else {
      result = await analyzePdf(buffer, label, notes, type, keepOriginal, apiKey);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    console.error("[training/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
