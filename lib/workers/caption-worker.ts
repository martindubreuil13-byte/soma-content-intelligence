import { readFile, writeFile } from "fs/promises";
import path from "path";
import { appendPersistentLearningSignal, createLearningEvent } from "@/lib/agent-training";
import { getChannelPath, isChannel, readTextFile, validateRunChannel } from "@/lib/channel-image-generation";
import { buildGenerationContext, renderContextForPrompt } from "@/lib/context/context-assembly";
import {
  createGenerationArtifact,
  createGenerationRun,
  upsertGenerationChannel,
} from "@/lib/db/generation-runs-db";
import { appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import { appendCaptionVersion, normalizeChannelLineage, readFeedbackFile } from "@/lib/feedback-lineage";
import { rebuildPreferenceMemory } from "@/lib/preference-memory";
import { uploadArtifactText, uploadJsonSnapshot } from "@/lib/storage/generation-storage";
import type { ContentChannel } from "@/lib/content-types";
import type { ChannelJobPayload, WorkerResult } from "@/lib/workers/worker-types";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

async function updateContentOutput(runId: string, channel: string, caption: string) {
  const outputPath = path.join(process.cwd(), "outputs", runId, "content-output.txt");

  try {
    const parsed = JSON.parse(await readFile(outputPath, "utf8")) as Record<string, unknown>;
    const channelValue = parsed[channel];
    if (channelValue && typeof channelValue === "object" && !Array.isArray(channelValue)) {
      parsed[channel] = { ...channelValue, caption };
      await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`);
    }
  } catch {
    // Compatibility mirror only.
  }
}

async function createRegeneratedCaption({
  channel,
  currentCaption,
  feedbackNotes,
  originalIdea,
  promptContext,
}: {
  channel: string;
  currentCaption: string;
  feedbackNotes: string;
  originalIdea: string;
  promptContext: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

  const brandVoice = await readTextFile(path.join(process.cwd(), "brand", "alpa-voice.md"));
  const bannedPhrases = await readTextFile(path.join(process.cwd(), "brand", "banned-phrases.md"));
  const ctaLibrary = await readTextFile(path.join(process.cwd(), "brand", "cta-library.md"));
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
  const prompt = `
${brandVoice}

${bannedPhrases}

CTA source:
${ctaLibrary}

${promptContext}

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

  if (!response.ok) throw new Error(result.error?.message ?? "OpenAI caption regeneration failed.");

  const rawContent = result.choices?.[0]?.message?.content ?? "";
  const parsedContent = JSON.parse(rawContent) as { caption?: unknown };

  if (typeof parsedContent.caption !== "string" || !parsedContent.caption.trim()) {
    throw new Error("OpenAI caption regeneration response did not include caption.");
  }

  return parsedContent.caption.trim();
}

export async function runCaptionWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as ChannelJobPayload;
  const runId = typeof payload.runId === "string" ? payload.runId : "";
  const channel = typeof payload.channel === "string" ? payload.channel : "";
  const validationMessage = validateRunChannel(runId, channel);

  if (validationMessage || !isChannel(channel)) {
    throw new Error(validationMessage ?? "Invalid channel.");
  }

  await appendExecutionEvent(job.id, "assembling_context", "Assembling caption context", { runId, channel });

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
  const unifiedContext = await buildGenerationContext({
    objective: "caption_regeneration",
    channel: channel as ContentChannel,
    rawIdea: typeof metadata.original_idea === "string" ? metadata.original_idea : null,
    legacyRunId: runId,
    includeSignedAssetUrls: false,
    persistSnapshot: true,
  }).catch(() => null);

  await appendExecutionEvent(job.id, "generating_caption", "Regenerating caption", { runId, channel });
  const caption = await createRegeneratedCaption({
    channel,
    currentCaption,
    feedbackNotes: previousCaption?.notes ?? "",
    originalIdea: typeof metadata.original_idea === "string" ? metadata.original_idea : "",
    promptContext: unifiedContext ? renderContextForPrompt(unifiedContext) : "",
  });
  const version = await appendCaptionVersion(runId, channel, { caption, generationType: "regenerate" });

  await writeFile(captionPath, `${caption}\n`);
  await updateContentOutput(runId, channel, caption);
  await appendExecutionEvent(job.id, "persisting_artifact", "Persisting caption artifacts", { runId, channel });

  const run = await createGenerationRun({
    legacyRunId: runId,
    rawIdea: typeof metadata.original_idea === "string" ? metadata.original_idea : null,
    status: "completed",
    source: "caption_regeneration",
    completedAt: new Date().toISOString(),
    metadata: { generation_context: metadata.generation_context ?? null },
  });
  const channelRow = await upsertGenerationChannel({
    runId: run.id,
    channel,
    status: "generated",
    caption,
    metadata: {
      legacy_run_id: runId,
      caption_version_id: version.id,
      attempt,
      generation_type: "regenerate",
    },
  });
  const artifact = await createGenerationArtifact({
    runId: run.id,
    channelId: channelRow.id,
    artifactType: "caption",
    version: attempt,
    content: caption,
    metadata: {
      legacy_run_id: runId,
      channel,
      caption_version_id: version.id,
      generation_type: "regenerate",
    },
  });

  await uploadArtifactText({
    generationRunId: run.id,
    generationChannelId: channelRow.id,
    channel,
    filename: "caption.txt",
    content: caption,
    artifactId: artifact.id,
    assetType: "caption_text",
    metadata: { legacy_run_id: runId, caption_version_id: version.id, generation_type: "regenerate" },
  }).catch(() => null);
  await uploadJsonSnapshot({
    generationRunId: run.id,
    generationChannelId: channelRow.id,
    channel,
    snapshotType: "caption",
    filename: "caption.json",
    content: { caption, caption_version_id: version.id, attempt, generation_type: "regenerate" },
  }).catch(() => null);

  await appendPersistentLearningSignal(createLearningEvent({ action: "regenerated", artifactType: "caption", channel, runId, version }));
  await rebuildPreferenceMemory().catch(() => null);

  return {
    runId,
    channel,
    caption,
    captionVersionId: version.id,
    artifactId: artifact.id,
    channelId: channelRow.id,
  };
}
