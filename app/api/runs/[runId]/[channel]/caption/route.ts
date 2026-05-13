import { readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { appendPersistentLearningSignal, createLearningEvent } from "@/lib/agent-training";
import { getChannelPath, isChannel, readTextFile, validateRunChannel } from "@/lib/channel-image-generation";
import { appendCaptionVersion, readFeedbackFile, normalizeChannelLineage } from "@/lib/feedback-lineage";
import { rebuildPreferenceMemory } from "@/lib/preference-memory";
import { readFullIntelligence } from "@/lib/brand-intelligence";
import { getActiveInjections } from "@/lib/training-injections";
import type { ContentChannel } from "@/lib/content-types";
import type { ICP, Angle, HookStyle, CTAStyle, NegativeConstraint } from "@/lib/brand-intelligence";

type RouteContext = {
  params: Promise<{
    runId: string;
    channel: string;
  }>;
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function updateContentOutput(runId: string, channel: string, caption: string) {
  const outputPath = path.join(process.cwd(), "outputs", runId, "content-output.txt");

  try {
    const parsed = JSON.parse(await readFile(outputPath, "utf8")) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return;
    }

    const record = parsed as Record<string, unknown>;
    const channelValue = record[channel];

    if (channelValue && typeof channelValue === "object" && !Array.isArray(channelValue)) {
      record[channel] = {
        ...channelValue,
        caption
      };
      await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`);
    }
  } catch {
    // Older or malformed content-output.txt files should not block caption regeneration.
  }
}

type IntelligenceContext = {
  activeIcps: ICP[];
  activeAngles: Angle[];
  activeHooks: HookStyle[];
  activeCtas: CTAStyle[];
  activeConstraints: NegativeConstraint[];
};

async function loadIntelligenceContext(channel: ContentChannel): Promise<IntelligenceContext> {
  try {
    const { icps, angles, hookStyles, ctaStyles, negativeConstraints } = await readFullIntelligence();

    const activeIcps = icps
      .filter((i) => i.isActive)
      .filter((i) => !i.platforms.length || i.platforms.includes(channel));
    const activeAngles = angles
      .filter((a) => a.isActive)
      .filter((a) => !a.platformAffinity.length || a.platformAffinity.includes(channel))
      .sort((a, b) => b.performanceScore - a.performanceScore);
    const activeHooks = hookStyles
      .filter((h) => h.isActive)
      .sort((a, b) => b.performanceScore - a.performanceScore);
    const activeCtas = ctaStyles
      .filter((c) => c.isActive)
      .sort((a, b) => b.performanceScore - a.performanceScore);
    const activeConstraints = negativeConstraints.filter((n) => n.isActive);

    return { activeIcps, activeAngles, activeHooks, activeCtas, activeConstraints };
  } catch {
    return { activeIcps: [], activeAngles: [], activeHooks: [], activeCtas: [], activeConstraints: [] };
  }
}

function buildIntelligenceSection(ctx: IntelligenceContext): string {
  const { activeIcps, activeAngles, activeHooks, activeCtas, activeConstraints } = ctx;
  if (!activeIcps.length && !activeAngles.length && !activeHooks.length) return "";

  const lines: string[] = ["--- BRAND INTELLIGENCE (strategic context for this regeneration) ---"];

  if (activeIcps.length) {
    lines.push("\nTarget Audiences — write for one of these:");
    activeIcps.slice(0, 3).forEach((icp) => {
      lines.push(`• ${icp.label}: ${icp.description}`);
      if (icp.painPoints.length) lines.push(`  Pain: ${icp.painPoints.slice(0, 2).join("; ")}`);
      if (icp.emotionalTriggers.length) lines.push(`  Triggers: ${icp.emotionalTriggers.slice(0, 2).join(", ")}`);
    });
  }

  if (activeAngles.length) {
    lines.push("\nContent Angles — pick the most relevant:");
    activeAngles.slice(0, 3).forEach((a) => {
      lines.push(`• ${a.label}: ${a.description}`);
    });
  }

  if (activeHooks.length) {
    lines.push("\nHook Styles — open with one of these:");
    activeHooks.slice(0, 4).forEach((h) => {
      lines.push(`• ${h.label}: "${h.example}"`);
    });
  }

  if (activeCtas.length) {
    lines.push("\nCTA Style — end with one of these:");
    activeCtas.slice(0, 2).forEach((c) => {
      lines.push(`• ${c.label}: "${c.example}"`);
    });
  }

  if (activeConstraints.length) {
    lines.push("\nNEVER use:");
    activeConstraints.forEach((n) => {
      lines.push(`• ${n.label}: ${n.examples.slice(0, 3).join(", ")}`);
    });
  }

  lines.push("--- END BRAND INTELLIGENCE ---");
  return lines.join("\n");
}

async function buildTrainingInjectionsSection(): Promise<string> {
  const injections = await getActiveInjections("caption");
  if (!injections.length) return "";

  const lines: string[] = ["--- TRAINING INJECTIONS (operator-curated learning signals for caption writing) ---"];

  const positiveInjections = injections.filter((i) => i.type !== "negative_training");
  const negativeInjections = injections.filter((i) => i.type === "negative_training");

  positiveInjections.forEach((inj) => {
    // Skip purely visual injections from caption prompts
    const hasNonVisualSignals =
      inj.extractedPreferences.length > 0 ||
      inj.extractedToneTags.length > 0 ||
      inj.extractedStrategicSignals.length > 0 ||
      inj.extractedAudienceSignals.length > 0 ||
      inj.extractedTags.length > 0 ||
      inj.notes ||
      inj.sourceText;
    if (!hasNonVisualSignals) return;

    lines.push(`\n[${inj.type.replace(/_/g, " ").toUpperCase()}] ${inj.label}`);
    if (inj.notes) lines.push(`  Context: ${inj.notes}`);
    if (inj.sourceText) lines.push(`  Reference: ${inj.sourceText.slice(0, 300)}${inj.sourceText.length > 300 ? "…" : ""}`);

    const captionSignals = [
      ...inj.extractedToneTags,
      ...inj.extractedStrategicSignals,
      ...inj.extractedAudienceSignals,
    ];
    if (captionSignals.length) lines.push(`  Tone & strategy: ${captionSignals.slice(0, 6).join("; ")}`);
    if (inj.extractedPreferences.length) lines.push(`  Apply: ${inj.extractedPreferences.join("; ")}`);
    if (inj.extractedTags.length) lines.push(`  Signals: ${inj.extractedTags.join(", ")}`);
  });

  if (negativeInjections.length) {
    lines.push("\nNEVER replicate these patterns:");
    negativeInjections.forEach((inj) => {
      lines.push(`• ${inj.label}${inj.notes ? `: ${inj.notes}` : ""}`);
      if (inj.extractedConstraints.length) lines.push(`  Avoid: ${inj.extractedConstraints.join("; ")}`);
    });
  }

  lines.push("--- END TRAINING INJECTIONS ---");
  return lines.join("\n");
}

async function writeGenerationContext(
  runId: string,
  channel: string,
  ctx: IntelligenceContext,
  attempt: number
) {
  try {
    const metaPath = path.join(process.cwd(), "outputs", runId, "meta.json");
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(await readFile(metaPath, "utf8")) as Record<string, unknown>;
    } catch {
      // meta.json may not exist for older runs — start fresh
    }

    const generationContext = (meta.generation_context as Record<string, unknown>) ?? {};
    generationContext[channel] = {
      attempt,
      active_icp_ids: ctx.activeIcps.slice(0, 3).map((i) => i.id),
      active_angle_ids: ctx.activeAngles.slice(0, 3).map((a) => a.id),
      active_hook_ids: ctx.activeHooks.slice(0, 4).map((h) => h.id),
      active_cta_ids: ctx.activeCtas.slice(0, 2).map((c) => c.id),
      active_constraint_ids: ctx.activeConstraints.map((n) => n.id),
      generated_at: new Date().toISOString()
    };
    meta.generation_context = generationContext;
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  } catch {
    // Don't break generation if context logging fails
  }
}

async function createRegeneratedCaption({
  channel,
  currentCaption,
  feedbackNotes,
  originalIdea,
  intelligenceSection,
  trainingInjectionsSection,
}: {
  channel: string;
  currentCaption: string;
  feedbackNotes: string;
  originalIdea: string;
  intelligenceSection: string;
  trainingInjectionsSection: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const brandVoice = await readTextFile(path.join(process.cwd(), "brand", "alpa-voice.md"));
  const bannedPhrases = await readTextFile(path.join(process.cwd(), "brand", "banned-phrases.md"));
  const ctaLibrary = await readTextFile(path.join(process.cwd(), "brand", "cta-library.md"));
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
  const prompt = `
${brandVoice}

${bannedPhrases}

CTA source:
${ctaLibrary}

${intelligenceSection ? `${intelligenceSection}\n` : ""}${trainingInjectionsSection ? `${trainingInjectionsSection}\n` : ""}
Regenerate only the ${channel} caption.

Original raw idea:
${originalIdea || "No original idea saved."}

Current caption to improve:
${currentCaption}

Operator feedback on the previous caption:
${feedbackNotes || "No written feedback. Make a meaningfully different, more grounded version."}

Rules:
- Return strict JSON only: {"caption":"..."}.
- Keep the same ALPA brand voice and official CTA URL rules.
- The caption must end with a calm CTA from the CTA library including the official ALPA URL exactly as written there.
- Make the new caption meaningfully different from the previous one.
- Avoid generic SaaS marketing, motivational influencer tone, corporate cadence, and hype.
- Preserve mobile-readable paragraph spacing.
- Use the Brand Intelligence context above to inform the ICP targeting, angle, hook style, and CTA approach.
`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });
  const result = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    throw new Error(result.error?.message ?? "OpenAI caption regeneration failed.");
  }

  const rawContent = result.choices?.[0]?.message?.content ?? "";
  const parsedContent = JSON.parse(rawContent) as { caption?: unknown };

  if (typeof parsedContent.caption !== "string" || !parsedContent.caption.trim()) {
    throw new Error("OpenAI caption regeneration response did not include caption.");
  }

  return parsedContent.caption.trim();
}

export async function POST(_request: Request, context: RouteContext) {
  const { runId, channel } = await context.params;
  const validationError = validateRunChannel(runId, channel);

  if (validationError || !isChannel(channel)) {
    return NextResponse.json({ error: validationError ?? "Invalid channel." }, { status: 400 });
  }

  try {
    const channelPath = getChannelPath(runId, channel);
    const captionPath = path.join(channelPath, "caption.txt");
    const currentCaption = await readTextFile(captionPath);
    const metadata = JSON.parse(await readTextFile(path.join(process.cwd(), "outputs", runId, "meta.json")) || "{}") as {
      original_idea?: unknown;
      generation_context?: unknown;
    };
    const { feedback } = await readFeedbackFile(runId);
    const lineage = normalizeChannelLineage(feedback[channel]);
    const previousCaption = lineage.captionVersions.at(-1);
    const attempt = lineage.captionVersions.length + 1;

    // Load Brand Intelligence and active training injections for the prompt
    const [intelligenceCtx, trainingInjectionsSection] = await Promise.all([
      loadIntelligenceContext(channel as ContentChannel),
      buildTrainingInjectionsSection(),
    ]);
    const intelligenceSection = buildIntelligenceSection(intelligenceCtx);

    const caption = await createRegeneratedCaption({
      channel,
      currentCaption,
      feedbackNotes: previousCaption?.notes ?? "",
      originalIdea: typeof metadata.original_idea === "string" ? metadata.original_idea : "",
      intelligenceSection,
      trainingInjectionsSection,
    });
    const version = await appendCaptionVersion(runId, channel, {
      caption,
      generationType: "regenerate"
    });

    await writeFile(captionPath, `${caption}\n`);
    await updateContentOutput(runId, channel, caption);

    // Log generation context to meta.json for downstream WinningPattern tracking
    await writeGenerationContext(runId, channel, intelligenceCtx, attempt);

    await appendPersistentLearningSignal(createLearningEvent({ action: "regenerated", artifactType: "caption", channel, runId, version }));

    try {
      await rebuildPreferenceMemory();
    } catch (error) {
      console.error("[caption] Preference synthesis failed", {
        runId,
        channel,
        message: error instanceof Error ? error.message : "Preference synthesis failed."
      });
    }

    return NextResponse.json({
      ok: true,
      runId,
      channel,
      caption,
      captionVersionId: version.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Caption regeneration failed.";

    console.error("[caption] Regeneration failed", {
      runId,
      channel,
      message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
