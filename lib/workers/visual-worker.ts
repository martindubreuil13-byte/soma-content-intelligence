import { writeFile } from "fs/promises";
import path from "path";
import {
  generateImageFromPrompt,
  getChannelPath,
  isChannel,
  normalizeVisualTweak,
  readRunMetadata,
  readTextFile,
  validateRunChannel,
  writeRunMetadata,
} from "@/lib/channel-image-generation";
import { buildGenerationContext, renderContextForPrompt } from "@/lib/context/context-assembly";
import { createGenerationArtifact, createGenerationRun, upsertGenerationChannel } from "@/lib/db/generation-runs-db";
import { appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import { appendVisualPromptVersion, getApprovedCaptionVersion } from "@/lib/feedback-lineage";
import { uploadArtifactText, uploadJsonSnapshot } from "@/lib/storage/generation-storage";
import { chooseVisualSelection } from "@/lib/visual-generation";
import type { ContentChannel } from "@/lib/content-types";
import type { ChannelJobPayload, WorkerResult } from "@/lib/workers/worker-types";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function getChannelFormatInstruction(channel: string) {
  if (channel === "linkedin") return "Recommend 4:5 or landscape. Use desktop UI assets only when relevant.";
  if (channel === "facebook") return "Recommend 4:5 or square. Use desktop or mobile assets depending on the scene.";
  if (channel === "instagram") return "Recommend 4:5 portrait. Use mobile or subtle desktop assets only when useful.";
  return "Recommend 9:16 vertical. Use mobile-first composition and mobile assets when relevant.";
}

async function createReimaginedVisualPrompt({
  assetMap,
  caption,
  channel,
  previousPrompt,
  selection,
  visualTweak,
}: {
  assetMap: string;
  caption: string;
  channel: string;
  previousPrompt: string;
  selection: ReturnType<typeof chooseVisualSelection>;
  visualTweak: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

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
- The prompt must use these exact section labels: Scene:, Format:, Reference assets to attach:, Asset usage instructions:, Realism rules:, Avoid:
- ${getChannelFormatInstruction(channel)}
`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const result = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) throw new Error(result.error?.message ?? "OpenAI internal visual brief generation failed.");

  const parsedContent = JSON.parse(result.choices?.[0]?.message?.content ?? "{}") as { visual_prompt?: unknown };
  if (typeof parsedContent.visual_prompt !== "string" || !parsedContent.visual_prompt.trim()) {
    throw new Error("OpenAI internal visual brief response did not include visual_prompt.");
  }

  return { model, visualPrompt: parsedContent.visual_prompt.trim() };
}

export async function runVisualWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as ChannelJobPayload;
  const runId = typeof payload.runId === "string" ? payload.runId : "";
  const channel = typeof payload.channel === "string" ? payload.channel : "";
  const validationMessage = validateRunChannel(runId, channel);

  if (validationMessage || !isChannel(channel)) {
    throw new Error(validationMessage ?? "Invalid channel.");
  }

  const visualTweak = normalizeVisualTweak(payload.visualTweak);
  const channelPath = getChannelPath(runId, channel);
  const captionPath = path.join(channelPath, "caption.txt");
  const visualPromptPath = path.join(channelPath, "visual_prompt.txt");

  await appendExecutionEvent(job.id, "assembling_context", "Assembling visual context", { runId, channel });
  const caption = await readTextFile(captionPath);
  const approvedCaption = await getApprovedCaptionVersion(runId, channel);
  if (!approvedCaption) throw new Error("Approve the latest caption before regenerating an image.");
  if (!caption) throw new Error("caption.txt is empty.");

  const currentVisualPrompt = await readTextFile(visualPromptPath);
  const metadata = await readRunMetadata(runId);
  const selection = chooseVisualSelection(channel, metadata.visual_archetypes?.[channel], metadata.concept_angles?.[channel]);
  const staticAssetMap = await readTextFile(path.join(process.cwd(), "assets", "reference-notes", "asset-map.md"));
  const unifiedContext = await buildGenerationContext({
    objective: "visual_regeneration",
    channel: channel as ContentChannel,
    legacyRunId: runId,
    includeSignedAssetUrls: true,
    persistSnapshot: true,
  }).catch(() => null);

  await appendExecutionEvent(job.id, "generating_visual_prompt", "Regenerating visual prompt", { runId, channel });
  const promptResult = await createReimaginedVisualPrompt({
    assetMap: [unifiedContext ? renderContextForPrompt(unifiedContext) : "", staticAssetMap].filter(Boolean).join("\n\n"),
    caption,
    channel,
    previousPrompt: currentVisualPrompt,
    selection,
    visualTweak,
  });
  const visualPromptVersion = await appendVisualPromptVersion(runId, channel, {
    generationType: "reimagine",
    visualPrompt: promptResult.visualPrompt,
  });

  await appendExecutionEvent(job.id, "generating_image", "Generating image for reimagined visual", { runId, channel });
  const generated = await generateImageFromPrompt({
    channel,
    conceptAngle: selection.conceptAngle,
    generationType: "reimagine",
    imageMetaExtra: {
      reimagined: true,
      visual_prompt_model: promptResult.model,
      visual_archetype: selection.visualArchetype,
      concept_angle: selection.conceptAngle,
    },
    parentCaptionText: approvedCaption.text ?? caption,
    parentCaptionVersionId: approvedCaption.id,
    runId,
    visualArchetype: selection.visualArchetype,
    visualTweak,
    visualPrompt: promptResult.visualPrompt,
  });

  await writeFile(visualPromptPath, `${promptResult.visualPrompt}\n`);
  await writeRunMetadata(runId, {
    ...metadata,
    visual_archetypes: { ...(metadata.visual_archetypes ?? {}), [channel]: selection.visualArchetype },
    concept_angles: { ...(metadata.concept_angles ?? {}), [channel]: selection.conceptAngle },
  });

  await appendExecutionEvent(job.id, "persisting_artifact", "Persisting visual artifacts", { runId, channel });
  const run = await createGenerationRun({
    legacyRunId: runId,
    rawIdea: typeof metadata.original_idea === "string" ? metadata.original_idea : null,
    status: "completed",
    source: "visual_reimagine",
    completedAt: new Date().toISOString(),
    metadata: {
      visual_archetypes: metadata.visual_archetypes ?? null,
      concept_angles: metadata.concept_angles ?? null,
    },
  });
  const channelRow = await upsertGenerationChannel({
    runId: run.id,
    channel,
    status: "generated",
    visualPrompt: promptResult.visualPrompt,
    imageUrl: generated.imageUrl,
    imageStoragePath: generated.imageStoragePath,
    metadata: {
      legacy_run_id: runId,
      visual_prompt_version_id: visualPromptVersion.id,
      image_version_id: generated.imageVersionId,
      generation_type: "reimagine",
      visual_archetype: selection.visualArchetype,
      concept_angle: selection.conceptAngle,
    },
  });
  const artifact = await createGenerationArtifact({
    runId: run.id,
    channelId: channelRow.id,
    artifactType: "visual_prompt",
    version: 1,
    content: promptResult.visualPrompt,
    metadata: {
      legacy_run_id: runId,
      channel,
      visual_prompt_version_id: visualPromptVersion.id,
      generation_type: "reimagine",
    },
  });

  await uploadArtifactText({
    generationRunId: run.id,
    generationChannelId: channelRow.id,
    channel,
    filename: "visual_prompt.txt",
    content: promptResult.visualPrompt,
    artifactId: artifact.id,
    assetType: "visual_prompt_text",
    metadata: { legacy_run_id: runId, visual_prompt_version_id: visualPromptVersion.id, generation_type: "reimagine" },
  }).catch(() => null);
  await uploadJsonSnapshot({
    generationRunId: run.id,
    generationChannelId: channelRow.id,
    channel,
    snapshotType: "visual_prompt",
    filename: "visual_prompt.json",
    content: {
      visual_prompt: promptResult.visualPrompt,
      visual_prompt_version_id: visualPromptVersion.id,
      generation_type: "reimagine",
      visual_archetype: selection.visualArchetype,
      concept_angle: selection.conceptAngle,
    },
  }).catch(() => null);

  return {
    runId,
    channel,
    reimagined: true,
    visualPrompt: promptResult.visualPrompt,
    visualPromptVersionId: visualPromptVersion.id,
    artifactId: artifact.id,
    ...generated,
  };
}
