import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type ExtractedTags = {
  audiences: string[];
  painPoints: string[];
  aspirations: string[];
  emotionalTriggers: string[];
  angles: string[];
  hookStyles: string[];
  ctaStyles: string[];
  platforms: string[];
  constraints: string[];
};

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function pickStrings(val: unknown): string[] {
  return Array.isArray(val)
    ? val.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
}

const SYSTEM_PROMPT = `You are a strategic content intelligence extractor for a social media content engine.

Given a short business description, extract operational tags for content targeting. Think like a direct-response copywriter, not a marketing consultant.

Rules for all tags:
- 1–5 words maximum per tag
- Concrete and specific — no abstract concepts
- Grounded in real operator language
- Zero fluff, zero jargon

Good tags: "inconsistent leads", "overwhelmed founder", "wants authority", "save time", "anti-corporate tone", "soft invitation CTA", "local service businesses", "contrarian hook"
Bad tags: "seeks empowerment", "holistic transformation", "unlock potential", "digital marketing solutions"

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "audiences": ["3–6 tags — who specifically is this for (job titles, business types, situations)"],
  "painPoints": ["3–6 tags — specific frustrating problems they face daily"],
  "aspirations": ["3–5 tags — what they actually want as an outcome"],
  "emotionalTriggers": ["2–4 tags — what emotionally drives or motivates them"],
  "angles": ["3–5 tags — content framing angles (e.g. 'operational pain', 'contrarian take', 'founder fatigue')"],
  "hookStyles": ["3–5 tags — how to open content (e.g. 'hard truth', 'curiosity gap', 'call out the problem')"],
  "ctaStyles": ["2–4 tags — tone of the desired action (e.g. 'soft invite', 'direct ask', 'no pressure')"],
  "platforms": ["1–3 platforms from exactly: linkedin, instagram, facebook, tiktok"],
  "constraints": ["2–4 tags — language or tone to always avoid (e.g. 'no hype language', 'no corporate jargon')"]
}`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      problem?: string;
      solution?: string;
      cta?: string;
    };
    const { problem = "", solution = "", cta = "" } = body;

    if (!problem.trim() && !solution.trim()) {
      return NextResponse.json({ error: "problem or solution is required." }, { status: 400 });
    }

    const userMessage = [
      problem.trim() && `Problem / audience: ${problem.trim()}`,
      solution.trim() && `Solution / transformation: ${solution.trim()}`,
      cta.trim() && `Desired action: ${cta.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const json = (await response.json()) as OpenAIChatResponse;
    if (json.error) throw new Error(json.error.message);

    const raw = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;

    const tags: ExtractedTags = {
      audiences: pickStrings(raw.audiences),
      painPoints: pickStrings(raw.painPoints),
      aspirations: pickStrings(raw.aspirations),
      emotionalTriggers: pickStrings(raw.emotionalTriggers),
      angles: pickStrings(raw.angles),
      hookStyles: pickStrings(raw.hookStyles),
      ctaStyles: pickStrings(raw.ctaStyles),
      platforms: pickStrings(raw.platforms),
      constraints: pickStrings(raw.constraints),
    };

    return NextResponse.json({ ok: true, tags });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed." },
      { status: 500 }
    );
  }
}
