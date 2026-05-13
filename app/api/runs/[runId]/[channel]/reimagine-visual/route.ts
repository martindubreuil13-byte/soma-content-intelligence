import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  generateImageFromPrompt,
  getChannelPath,
  isChannel,
  normalizeVisualTweak,
  readRunMetadata,
  readTextFile,
  validateRunChannel,
  writeRunMetadata
} from "@/lib/channel-image-generation";
import { appendVisualPromptVersion, getApprovedCaptionVersion } from "@/lib/feedback-lineage";
import { chooseVisualSelection } from "@/lib/visual-generation";

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

type ReimagineRequest = {
  visualTweak?: unknown;
};

function getChannelFormatInstruction(channel: string) {
  if (channel === "linkedin") {
    return "Recommend 4:5 or landscape. Use desktop UI assets only when relevant.";
  }

  if (channel === "facebook") {
    return "Recommend 4:5 or square. Use desktop or mobile assets depending on the scene.";
  }

  if (channel === "instagram") {
    return "Recommend 4:5 portrait. Use mobile or subtle desktop assets only when useful.";
  }

  return "Recommend 9:16 vertical. Use mobile-first composition and mobile assets when relevant.";
}

async function createReimaginedVisualPrompt({
  assetMap,
  caption,
  channel,
  previousPrompt,
  selection,
  visualTweak
}: {
  assetMap: string;
  caption: string;
  channel: string;
  previousPrompt: string;
  selection: ReturnType<typeof chooseVisualSelection>;
  visualTweak: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
  const prompt = `
Create one new visual_prompt.txt for the ${channel} channel.

Keep the existing caption unchanged. Generate a new image prompt only.

Caption to reinterpret visually:
${caption}

Current visual_prompt.txt to move away from:
${previousPrompt || "None"}

New visual archetype, which controls HOW the image looks:
${selection.archetypeBrief}

New concept angle, which controls WHAT the image communicates:
${selection.conceptBrief}

User's Visual Direction Tweaks:
${visualTweak || "None"}

Asset grounding:
${assetMap}

Rules:
- Return strict JSON only: {"visual_prompt":"..."}.
- Create a completely different visual concept.
- Do not merely change lighting, color, camera angle, crop, lens, or time of day.
- Reinterpret the caption visually with a different storytelling direction.
- Preserve platform realism rules: believable, photographic, documentary/editorial, grounded, human.
- Preserve ALPA asset rules: use assets only when useful, not forced.
- Treat Visual Direction Tweaks as additional creative direction only. They must not override realism rules, platform calibration, ALPA branding philosophy, asset rules, or brand subtlety.
- Do not force dashboard screenshots into the image.
- Allow logo-only integration, indirect ALPA presence, environmental branding, or no UI when stronger.
- The prompt must use these exact section labels:
  Scene:
  Format:
  Reference assets to attach:
  Asset usage instructions:
  Realism rules:
  Avoid:
- ${getChannelFormatInstruction(channel)}
- If no asset is needed, write "None required" under Reference assets to attach.
- Avoid surrealism, fantasy, cyberpunk, holograms, fake SaaS dashboards, floating overlays, overdesigned startup art, and stock-photo polish.
- Keep it concise, visual, cinematic, and usable for image generation.
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
    throw new Error(result.error?.message ?? "OpenAI internal visual brief generation failed.");
  }

  const rawContent = result.choices?.[0]?.message?.content ?? "";
  let parsedContent: unknown;

  try {
    parsedContent = JSON.parse(rawContent);
  } catch {
    throw new Error("OpenAI internal visual brief response was not valid JSON.");
  }

  if (!parsedContent || typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
    throw new Error("OpenAI internal visual brief response must be a JSON object.");
  }

  const visualPrompt = (parsedContent as { visual_prompt?: unknown }).visual_prompt;

  if (typeof visualPrompt !== "string" || !visualPrompt.trim()) {
    throw new Error("OpenAI internal visual brief response did not include visual_prompt.");
  }

  return {
    model,
    visualPrompt: visualPrompt.trim()
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { runId, channel } = await context.params;
  const validationError = validateRunChannel(runId, channel);

  if (validationError || !isChannel(channel)) {
    return NextResponse.json({ error: validationError ?? "Invalid channel." }, { status: 400 });
  }

  const channelPath = getChannelPath(runId, channel);
  const captionPath = path.join(channelPath, "caption.txt");
  const visualPromptPath = path.join(channelPath, "visual_prompt.txt");

  try {
    const requestBody = (await request.json().catch(() => ({}))) as ReimagineRequest;
    const visualTweak = normalizeVisualTweak(requestBody.visualTweak);
    const caption = await readTextFile(captionPath);
    const approvedCaption = await getApprovedCaptionVersion(runId, channel);

    if (!approvedCaption) {
      return NextResponse.json({ error: "Approve the latest caption before regenerating an image." }, { status: 409 });
    }

    if (!caption) {
      return NextResponse.json({ error: "caption.txt is empty." }, { status: 400 });
    }

    const currentVisualPrompt = await readTextFile(visualPromptPath);
    const metadata = await readRunMetadata(runId);
    const selection = chooseVisualSelection(
      channel,
      metadata.visual_archetypes?.[channel],
      metadata.concept_angles?.[channel]
    );
    const assetMap = await readTextFile(path.join(process.cwd(), "assets", "reference-notes", "asset-map.md"));
    const promptResult = await createReimaginedVisualPrompt({
      assetMap,
      caption,
      channel,
      previousPrompt: currentVisualPrompt,
      selection,
      visualTweak
    });

    await appendVisualPromptVersion(runId, channel, {
      generationType: "reimagine",
      visualPrompt: promptResult.visualPrompt
    });

    const generated = await generateImageFromPrompt({
      channel,
      conceptAngle: selection.conceptAngle,
      generationType: "reimagine",
      imageMetaExtra: {
        reimagined: true,
        visual_prompt_model: promptResult.model,
        visual_archetype: selection.visualArchetype,
        concept_angle: selection.conceptAngle
      },
      parentCaptionText: approvedCaption.text ?? caption,
      parentCaptionVersionId: approvedCaption.id,
      runId,
      visualArchetype: selection.visualArchetype,
      visualTweak,
      visualPrompt: promptResult.visualPrompt
    });

    await writeFile(visualPromptPath, `${promptResult.visualPrompt}\n`);
    await writeRunMetadata(runId, {
      ...metadata,
      visual_archetypes: {
        ...(metadata.visual_archetypes ?? {}),
        [channel]: selection.visualArchetype
      },
      concept_angles: {
        ...(metadata.concept_angles ?? {}),
        [channel]: selection.conceptAngle
      }
    });

    return NextResponse.json({
      ok: true,
      runId,
      channel,
      reimagined: true,
      visualPrompt: promptResult.visualPrompt,
      visualArchetype: selection.visualArchetype,
      conceptAngle: selection.conceptAngle,
      ...generated
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reimagine visual failed.";

    console.error("[reimagine-visual] Generation failed", {
      runId,
      channel,
      message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
