import { stat } from "fs/promises";
import path from "path";
import {
  generateImageFromPrompt,
  getChannelPath,
  imageFileName,
  isChannel,
  normalizeVisualTweak,
  readRunMetadata,
  readTextFile,
  validateRunChannel,
} from "@/lib/channel-image-generation";
import { buildGenerationContext } from "@/lib/context/context-assembly";
import { createGenerationArtifact, createGenerationRun, upsertGenerationChannel } from "@/lib/db/generation-runs-db";
import { appendExecutionEvent, type ExecutionJob } from "@/lib/db/execution-jobs-db";
import { getApprovedCaptionVersion } from "@/lib/feedback-lineage";
import { uploadJsonSnapshot } from "@/lib/storage/generation-storage";
import type { ContentChannel } from "@/lib/content-types";
import type { ChannelJobPayload, WorkerResult } from "@/lib/workers/worker-types";

export async function runImageWorker(job: ExecutionJob): Promise<WorkerResult> {
  const payload = job.payload as ChannelJobPayload;
  const runId = typeof payload.runId === "string" ? payload.runId : "";
  const channel = typeof payload.channel === "string" ? payload.channel : "";
  const validationMessage = validateRunChannel(runId, channel);

  if (validationMessage || !isChannel(channel)) {
    throw new Error(validationMessage ?? "Invalid channel.");
  }

  const visualTweak = normalizeVisualTweak(payload.visualTweak);

  await appendExecutionEvent(job.id, "assembling_context", "Assembling image context", { runId, channel });
  await buildGenerationContext({
    objective: "image_generation",
    channel: channel as ContentChannel,
    legacyRunId: runId,
    includeSignedAssetUrls: true,
    persistSnapshot: true,
  }).catch(() => null);

  const visualPromptPath = path.join(getChannelPath(runId, channel), "visual_prompt.txt");
  const visualPrompt = await readTextFile(visualPromptPath);
  const approvedCaption = await getApprovedCaptionVersion(runId, channel);

  if (!approvedCaption) throw new Error("Approve the latest caption before generating an image.");
  if (!visualPrompt) throw new Error("visual_prompt.txt is empty.");

  const imagePath = path.join(getChannelPath(runId, channel), imageFileName);
  const imageAlreadyExists = await stat(imagePath).then((fileStat) => fileStat.isFile()).catch(() => false);
  const metadata = await readRunMetadata(runId);

  await appendExecutionEvent(job.id, "generating_image", "Generating image", { runId, channel });
  const generated = await generateImageFromPrompt({
    channel,
    conceptAngle: metadata.concept_angles?.[channel],
    generationType: imageAlreadyExists ? "regenerate" : "initial",
    parentCaptionText: approvedCaption.text ?? approvedCaption.captionExcerpt ?? "",
    parentCaptionVersionId: approvedCaption.id,
    runId,
    visualArchetype: metadata.visual_archetypes?.[channel],
    visualTweak,
    visualPrompt,
  });

  await appendExecutionEvent(job.id, "uploading_asset", "Image storage persistence attempted", {
    runId,
    channel,
    imageStoragePath: generated.imageStoragePath,
  });
  await appendExecutionEvent(job.id, "persisting_artifact", "Persisting image artifacts", { runId, channel });

  const run = await createGenerationRun({
    legacyRunId: runId,
    rawIdea: typeof metadata.original_idea === "string" ? metadata.original_idea : null,
    status: "completed",
    source: "image_generation",
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
    imageUrl: generated.imageUrl,
    imageStoragePath: generated.imageStoragePath,
    metadata: {
      legacy_run_id: runId,
      image_version_id: generated.imageVersionId,
      generation_type: imageAlreadyExists ? "regenerate" : "initial",
    },
  });
  const artifact = await createGenerationArtifact({
    runId: run.id,
    channelId: channelRow.id,
    artifactType: "image",
    version: 1,
    storagePath: generated.imageStoragePath,
    publicUrl: generated.imageUrl,
    metadata: {
      legacy_run_id: runId,
      channel,
      image_version_id: generated.imageVersionId,
      image_file: generated.imageFile,
      attached_assets: generated.attachedAssets,
      model: generated.model,
      size: generated.size,
    },
  });

  await uploadJsonSnapshot({
    generationRunId: run.id,
    generationChannelId: channelRow.id,
    channel,
    snapshotType: "image_generation",
    filename: "image-generation.json",
    content: {
      image_url: generated.imageUrl,
      image_storage_path: generated.imageStoragePath,
      image_version_id: generated.imageVersionId,
      image_file: generated.imageFile,
      attached_assets: generated.attachedAssets,
      generated_at: generated.generatedAt,
    },
  }).catch(() => null);

  return {
    runId,
    channel,
    visualPrompt,
    reimagined: false,
    artifactId: artifact.id,
    channelId: channelRow.id,
    ...generated,
  };
}
