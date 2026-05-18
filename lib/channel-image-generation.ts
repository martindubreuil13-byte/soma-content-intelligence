import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { appendPersistentLearningSignal, createLearningEvent } from "@/lib/agent-training";
import { appendImageVersion, ensureVisualPromptVersion, excerpt } from "@/lib/feedback-lineage";
import { uploadGeneratedImage, uploadJsonSnapshot } from "@/lib/storage/generation-storage";
import type { ContentChannel, FeedbackGenerationType } from "@/lib/content-types";

export const imageFileName = "generated-image.png";
export const channels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

const runIdPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export type RunMetadata = {
  visual_archetypes?: Record<string, string>;
  concept_angles?: Record<string, string>;
  [key: string]: unknown;
};

type ImageMetaExtra = Record<string, unknown>;

export function normalizeVisualTweak(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

export function isChannel(channel: string): channel is ContentChannel {
  return channels.includes(channel as ContentChannel);
}

export function validateRunChannel(runId: string, channel: string) {
  if (!runIdPattern.test(runId)) {
    return "Invalid run id.";
  }

  if (!isChannel(channel)) {
    return "Invalid channel.";
  }

  return null;
}

export function getChannelPath(runId: string, channel: ContentChannel) {
  return path.join(process.cwd(), "outputs", runId, channel);
}

export async function readTextFile(filePath: string) {
  try {
    return (await readFile(filePath, "utf8")).trim();
  } catch {
    return "";
  }
}

export async function readRunMetadata(runId: string): Promise<RunMetadata> {
  try {
    const rawMetadata = await readFile(path.join(process.cwd(), "outputs", runId, "meta.json"), "utf8");
    const parsedMetadata = JSON.parse(rawMetadata) as unknown;

    if (parsedMetadata && typeof parsedMetadata === "object" && !Array.isArray(parsedMetadata)) {
      return parsedMetadata as RunMetadata;
    }
  } catch {
    // Missing or malformed metadata should not block image generation.
  }

  return {};
}

export async function writeRunMetadata(runId: string, metadata: RunMetadata) {
  await writeFile(
    path.join(process.cwd(), "outputs", runId, "meta.json"),
    JSON.stringify(metadata, null, 2)
  );

  await uploadJsonSnapshot({
    legacyRunId: runId,
    snapshotType: "meta",
    filename: "meta.json",
    content: metadata,
  }).catch((error) => {
    console.error("[metadata] Storage snapshot persistence failed", {
      runId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });
}

function getChannelImageSize(channel: ContentChannel) {
  if (channel === "linkedin") {
    return "1536x1024";
  }

  if (channel === "tiktok" || channel === "instagram") {
    return "1024x1536";
  }

  return "1024x1024";
}

function getContentType(filePath: string) {
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (filePath.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/png";
}

function getReferencedAssetPaths(prompt: string) {
  const matches = prompt.match(/assets\/[A-Za-z0-9/_-]+?\.(?:png|jpg|jpeg|webp)/g) ?? [];
  const uniqueMatches = Array.from(new Set(matches));

  return uniqueMatches
    .map((assetPath) => path.normalize(assetPath).replace(/^assets[\\/]/, ""))
    .filter((assetPath) => !assetPath.startsWith("..") && !path.isAbsolute(assetPath))
    .map((assetPath) => path.join(process.cwd(), "assets", assetPath));
}

async function getExistingAssetPaths(prompt: string) {
  const assetPaths = getReferencedAssetPaths(prompt);
  const existingPaths: string[] = [];

  for (const assetPath of assetPaths) {
    try {
      const assetStat = await stat(assetPath);

      if (assetStat.isFile()) {
        existingPaths.push(assetPath);
      }
    } catch {
      // Ignore prompt references that do not exist locally.
    }
  }

  return existingPaths;
}

async function appendReferenceImages(formData: FormData, assetPaths: string[]) {
  for (const assetPath of assetPaths) {
    const bytes = await readFile(assetPath);
    const blob = new Blob([bytes], { type: getContentType(assetPath) });

    formData.append("image[]", blob, path.basename(assetPath));
  }
}

async function callOpenAIImageAPI(prompt: string, channel: ContentChannel, assetPaths: string[], visualTweak = "") {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
  const quality = process.env.OPENAI_IMAGE_QUALITY ?? "medium";
  const size = getChannelImageSize(channel);
  const endpoint = assetPaths.length
    ? "https://api.openai.com/v1/images/edits"
    : "https://api.openai.com/v1/images/generations";

  const tweakInstruction = visualTweak
    ? [
        "Additional visual direction tweak from the user:",
        visualTweak,
        "",
        "Treat this tweak as extra creative direction only. It must not override platform realism rules, ALPA asset rules, brand subtlety, or the requirement for believable grounded photography."
      ].join("\n")
    : "";
  const groundedPrompt = [
    prompt,
    ...(tweakInstruction ? ["", tweakInstruction] : []),
    "",
    "Use any attached reference images as grounding assets. Composite real ALPA UI screenshots into device screens when referenced. Preserve screenshot proportions and avoid inventing fake dashboard UI."
  ].join("\n");

  let body: BodyInit;
  let headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`
  };

  if (assetPaths.length) {
    const formData = new FormData();
    formData.append("model", model);
    formData.append("prompt", groundedPrompt);
    formData.append("size", size);
    formData.append("quality", quality);
    formData.append("output_format", "png");
    formData.append("n", "1");
    await appendReferenceImages(formData, assetPaths);
    body = formData;
  } else {
    headers = {
      ...headers,
      "Content-Type": "application/json"
    };
    body = JSON.stringify({
      model,
      prompt: groundedPrompt,
      size,
      quality,
      output_format: "png",
      n: 1
    });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body
  });
  const result = (await response.json()) as OpenAIImageResponse;

  if (!response.ok) {
    throw new Error(result.error?.message ?? "OpenAI image generation failed.");
  }

  const imageData = result.data?.[0]?.b64_json;

  if (!imageData) {
    throw new Error("OpenAI image generation returned no image data.");
  }

  return {
    imageBuffer: Buffer.from(imageData, "base64"),
    model,
    quality,
    size,
    endpoint,
    attachedAssets: assetPaths.map((assetPath) => path.relative(process.cwd(), assetPath))
  };
}

export async function generateImageFromPrompt({
  channel,
  conceptAngle,
  generationType = "regenerate",
  imageMetaExtra = {},
  parentCaptionText = "",
  parentCaptionVersionId,
  runId,
  visualArchetype,
  visualTweak = "",
  visualPrompt
}: {
  channel: ContentChannel;
  conceptAngle?: string;
  generationType?: FeedbackGenerationType;
  imageMetaExtra?: ImageMetaExtra;
  parentCaptionText?: string;
  parentCaptionVersionId?: string;
  runId: string;
  visualArchetype?: string;
  visualTweak?: string;
  visualPrompt: string;
}) {
  const channelPath = getChannelPath(runId, channel);
  const imagePath = path.join(channelPath, imageFileName);
  const imageMetaPath = path.join(channelPath, "image-meta.json");
  const captionGrounding = parentCaptionText
    ? [
        visualPrompt,
        "",
        "Approved caption version to ground this image:",
        parentCaptionText,
        "",
        "The image must support this approved caption's specific message and emotional direction."
      ].join("\n")
    : visualPrompt;
  const assetPaths = await getExistingAssetPaths(captionGrounding);
  const normalizedVisualTweak = normalizeVisualTweak(visualTweak);
  const generated = await callOpenAIImageAPI(captionGrounding, channel, assetPaths, normalizedVisualTweak);
  const generatedAt = new Date().toISOString();
  const archiveStamp = generatedAt.replace(/[:.]/g, "-");
  const archivedImageFileName = `generated-image-${archiveStamp}.png`;
  const archivedImagePath = path.join(channelPath, archivedImageFileName);

  await mkdir(channelPath, { recursive: true });
  await ensureVisualPromptVersion(runId, channel, visualPrompt);
  await writeFile(archivedImagePath, generated.imageBuffer);
  await writeFile(imagePath, generated.imageBuffer);
  const imageMetadata = {
    generated_at: generatedAt,
    model: generated.model,
    quality: generated.quality,
    size: generated.size,
    endpoint: generated.endpoint,
    attached_assets: generated.attachedAssets,
    source_prompt: "visual_prompt.txt",
    image_file: imageFileName,
    parent_caption_version_id: parentCaptionVersionId ?? "",
    ...(normalizedVisualTweak ? { visual_tweak: normalizedVisualTweak } : {}),
    ...imageMetaExtra
  };
  await writeFile(
    imageMetaPath,
    JSON.stringify(imageMetadata, null, 2)
  );
  const relativeImagePath = path.relative(process.cwd(), archivedImagePath);
  const imageVersion = await appendImageVersion(runId, channel, {
    archetype: visualArchetype,
    conceptAngle,
    generationType,
    imagePath: relativeImagePath,
    parentCaptionVersionId,
    promptExcerpt: excerpt(captionGrounding)
  });

  if (generationType !== "initial") {
    await appendPersistentLearningSignal(createLearningEvent({ action: "regenerated", artifactType: "image", channel, runId, version: imageVersion }));
  }

  const storageUpload = await uploadGeneratedImage({
    legacyRunId: runId,
    channel,
    filename: archivedImageFileName,
    bytes: generated.imageBuffer,
    metadata: {
      image_version_id: imageVersion.id,
      current_image_file: imageFileName,
      local_image_file: relativeImagePath,
      ...imageMetadata,
    },
  }).catch((error) => {
    console.error("[image] Storage asset persistence failed", {
      runId,
      channel,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  });
  await uploadGeneratedImage({
    legacyRunId: runId,
    channel,
    filename: imageFileName,
    bytes: generated.imageBuffer,
    metadata: {
      image_version_id: imageVersion.id,
      archived_image_file: archivedImageFileName,
      local_image_file: path.relative(process.cwd(), imagePath),
      current: true,
      ...imageMetadata,
    },
  }).catch((error) => {
    console.error("[image] Current image storage persistence failed", {
      runId,
      channel,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });

  await uploadJsonSnapshot({
    legacyRunId: runId,
    channel,
    snapshotType: "image_meta",
    filename: "image-meta.json",
    content: imageMetadata,
  }).catch((error) => {
    console.error("[image] Image metadata snapshot persistence failed", {
      runId,
      channel,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });

  return {
    imageUrl: `/api/runs/${encodeURIComponent(runId)}/${channel}/image?t=${Date.now()}`,
    imageFile: relativeImagePath,
    imageVersionId: imageVersion.id,
    metaFile: path.relative(process.cwd(), imageMetaPath),
    imageStoragePath: storageUpload?.path ?? null,
    attachedAssets: generated.attachedAssets,
    model: generated.model,
    size: generated.size,
    generatedAt
  };
}
