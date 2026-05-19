import { readFile, writeFile } from "fs/promises";
import path from "path";
import {
  appendLineageVersion,
  createLineageArtifact,
  getFeedbackLineage,
  lineageVersionToFeedbackVersion,
  updateLineageVersionFeedback,
} from "@/lib/db/feedback-lineage-db";
import type {
  ChannelFeedback,
  ChannelFeedbackLineage,
  ContentChannel,
  FeedbackGenerationType,
  FeedbackStatus,
  FeedbackTarget,
  FeedbackVersion
} from "@/lib/content-types";

export const feedbackChannels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

type RawFeedbackVersion = {
  id?: unknown;
  created_at?: unknown;
  generation_type?: unknown;
  status?: unknown;
  notes?: unknown;
  updated_at?: unknown;
  tags?: unknown;
  archetype?: unknown;
  concept_angle?: unknown;
  prompt_excerpt?: unknown;
  image_path?: unknown;
  caption_excerpt?: unknown;
  parent_caption_version_id?: unknown;
  regeneration_index?: unknown;
  text?: unknown;
  source_visual_prompt_version_id?: unknown;
};

type RawFeedbackSection = {
  status?: unknown;
  notes?: unknown;
  updated_at?: unknown;
};

export type RawChannelFeedback = {
  caption_versions?: unknown;
  visual_prompt_versions?: unknown;
  image_versions?: unknown;
  caption?: RawFeedbackSection;
  visual_prompt?: RawFeedbackSection;
  image?: RawFeedbackSection;
  status?: unknown;
  notes?: unknown;
  updated_at?: unknown;
};

export type FeedbackFile = Record<
  ContentChannel,
  {
    caption_versions: RawFeedbackVersion[];
    visual_prompt_versions: RawFeedbackVersion[];
    image_versions: RawFeedbackVersion[];
  }
>;

export type AppendImageVersionInput = {
  archetype?: string;
  conceptAngle?: string;
  generationType: FeedbackGenerationType;
  imagePath: string;
  parentCaptionVersionId?: string;
  promptExcerpt: string;
};

export type AppendCaptionVersionInput = {
  caption: string;
  generationType: FeedbackGenerationType;
};

export type AppendVisualPromptVersionInput = {
  generationType: FeedbackGenerationType;
  visualPrompt: string;
};

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return value === "approved" || value === "rejected" || value === "pending";
}

function isGenerationType(value: unknown): value is FeedbackGenerationType {
  return value === "initial" || value === "regenerate" || value === "reimagine";
}

export function getNeutralFeedback(): ChannelFeedback {
  return {
    status: "pending",
    notes: ""
  };
}

export function excerpt(value: string, limit = 220) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function versionId(prefix: FeedbackTarget, index: number) {
  const normalizedPrefix = prefix === "visualPrompt" ? "visual_prompt" : prefix;

  return `${normalizedPrefix}_${String(index + 1).padStart(3, "0")}`;
}

function normalizeVersion(value: unknown, target: FeedbackTarget, index: number): FeedbackVersion {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as RawFeedbackVersion) : {};
  const createdAt = getString(record.created_at) || new Date().toISOString();
  const generationType = isGenerationType(record.generation_type) ? record.generation_type : "initial";
  const legacyStatus = record.status === "neutral" ? "pending" : record.status;
  const status = isFeedbackStatus(legacyStatus) ? legacyStatus : "pending";

  return {
    id: getString(record.id) || versionId(target, index),
    createdAt,
    generationType,
    status,
    notes: getString(record.notes),
    ...(getString(record.text) ? { text: getString(record.text) } : {}),
    ...(getString(record.updated_at) ? { updatedAt: getString(record.updated_at) } : {}),
    ...(Array.isArray(record.tags) && record.tags.length
      ? { tags: (record.tags as unknown[]).filter((t) => typeof t === "string") as string[] }
      : {}),
    ...(getString(record.archetype) ? { archetype: getString(record.archetype) } : {}),
    ...(getString(record.concept_angle) ? { conceptAngle: getString(record.concept_angle) } : {}),
    ...(getString(record.prompt_excerpt) ? { promptExcerpt: getString(record.prompt_excerpt) } : {}),
    ...(getString(record.image_path) ? { imagePath: getString(record.image_path) } : {}),
    ...(getString(record.caption_excerpt) ? { captionExcerpt: getString(record.caption_excerpt) } : {}),
    ...(getString(record.parent_caption_version_id) ? { parentCaptionVersionId: getString(record.parent_caption_version_id) } : {}),
    ...(getNumber(record.regeneration_index) !== undefined ? { regenerationIndex: getNumber(record.regeneration_index) } : {}),
    ...(getString(record.source_visual_prompt_version_id)
      ? { sourceVisualPromptVersionId: getString(record.source_visual_prompt_version_id) }
      : {})
  };
}

function serializeVersion(version: FeedbackVersion): RawFeedbackVersion {
  return {
    id: version.id,
    created_at: version.createdAt,
    generation_type: version.generationType,
    status: version.status,
    notes: version.notes,
    updated_at: version.updatedAt ?? "",
    ...(version.text ? { text: version.text } : {}),
    ...(version.tags?.length ? { tags: version.tags } : {}),
    ...(version.archetype ? { archetype: version.archetype } : {}),
    ...(version.conceptAngle ? { concept_angle: version.conceptAngle } : {}),
    ...(version.promptExcerpt ? { prompt_excerpt: version.promptExcerpt } : {}),
    ...(version.imagePath ? { image_path: version.imagePath } : {}),
    ...(version.captionExcerpt ? { caption_excerpt: version.captionExcerpt } : {}),
    ...(version.parentCaptionVersionId ? { parent_caption_version_id: version.parentCaptionVersionId } : {}),
    ...(version.regenerationIndex !== undefined ? { regeneration_index: version.regenerationIndex } : {}),
    ...(version.sourceVisualPromptVersionId ? { source_visual_prompt_version_id: version.sourceVisualPromptVersionId } : {})
  };
}

function initialVersionFromSection(section: unknown, target: FeedbackTarget, excerptValue: string): FeedbackVersion {
  const value = section && typeof section === "object" && !Array.isArray(section) ? (section as RawFeedbackSection) : {};
  const legacyStatus = value.status === "neutral" ? "pending" : value.status;
  const status = isFeedbackStatus(legacyStatus) ? legacyStatus : "pending";

  return {
    id: versionId(target, 0),
    createdAt: getString(value.updated_at) || new Date().toISOString(),
    generationType: "initial",
    status,
    notes: getString(value.notes),
    updatedAt: getString(value.updated_at) || undefined,
    ...(target === "caption"
      ? { captionExcerpt: excerptValue, text: excerptValue }
      : { promptExcerpt: excerptValue, text: excerptValue })
  };
}

function emptyChannelLineage(): ChannelFeedbackLineage {
  return {
    captionVersions: [],
    visualPromptVersions: [],
    imageVersions: []
  };
}

export function normalizeChannelLineage(value: unknown, captionExcerpt = "", promptExcerpt = ""): ChannelFeedbackLineage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyChannelLineage();
  }

  const record = value as RawChannelFeedback;
  const hasLineage =
    Array.isArray(record.caption_versions) ||
    Array.isArray(record.visual_prompt_versions) ||
    Array.isArray(record.image_versions);

  if (hasLineage) {
    return {
      captionVersions: (Array.isArray(record.caption_versions) ? record.caption_versions : []).map((version, index) =>
        normalizeVersion(version, "caption", index)
      ),
      visualPromptVersions: (Array.isArray(record.visual_prompt_versions) ? record.visual_prompt_versions : []).map((version, index) =>
        normalizeVersion(version, "visualPrompt", index)
      ),
      imageVersions: (Array.isArray(record.image_versions) ? record.image_versions : []).map((version, index) =>
        normalizeVersion(version, "image", index)
      )
    };
  }

  if ("caption" in record || "image" in record) {
    return {
      captionVersions: [initialVersionFromSection(record.caption, "caption", captionExcerpt)],
      visualPromptVersions: record.visual_prompt
        ? [initialVersionFromSection(record.visual_prompt, "visualPrompt", promptExcerpt)]
        : [],
      imageVersions: [initialVersionFromSection(record.image, "image", promptExcerpt)]
    };
  }

  return {
    captionVersions: [initialVersionFromSection(record, "caption", captionExcerpt)],
    visualPromptVersions: [],
    imageVersions: []
  };
}

export function serializeLineage(lineage: ChannelFeedbackLineage) {
  return {
    caption_versions: lineage.captionVersions.map(serializeVersion),
    visual_prompt_versions: lineage.visualPromptVersions.map(serializeVersion),
    image_versions: lineage.imageVersions.map(serializeVersion)
  };
}

export function currentFeedbackFromLineage(lineage: ChannelFeedbackLineage) {
  const currentCaption = lineage.captionVersions.at(-1);
  const currentVisualPrompt = lineage.visualPromptVersions.at(-1);
  const currentImage = lineage.imageVersions.at(-1);

  return {
    caption: currentCaption
      ? {
          status: currentCaption.status,
          notes: currentCaption.notes,
          updatedAt: currentCaption.updatedAt
        }
      : getNeutralFeedback(),
    visualPrompt: currentVisualPrompt
      ? {
          status: currentVisualPrompt.status,
          notes: currentVisualPrompt.notes,
          updatedAt: currentVisualPrompt.updatedAt
        }
      : getNeutralFeedback(),
    image: currentImage
      ? {
          status: currentImage.status,
          notes: currentImage.notes,
          updatedAt: currentImage.updatedAt
        }
      : getNeutralFeedback()
  };
}

export function getCurrentVersionId(lineage: ChannelFeedbackLineage, target: FeedbackTarget) {
  const versions =
    target === "caption"
      ? lineage.captionVersions
      : target === "visualPrompt"
      ? lineage.visualPromptVersions
      : lineage.imageVersions;

  return versions.at(-1)?.id;
}

function emptyFeedbackFile(): FeedbackFile {
  return Object.fromEntries(feedbackChannels.map((channel) => [channel, serializeLineage(emptyChannelLineage())])) as FeedbackFile;
}

async function readDbFeedback(runId: string): Promise<FeedbackFile | null> {
  const entries = await Promise.all(
    feedbackChannels.map(async (channel) => {
      const result = await getFeedbackLineage({ legacyRunId: runId, channel });
      if (!result) return [channel, serializeLineage(emptyChannelLineage())] as const;

      const captionVersions = result.versions
        .filter((version) => version.artifactType === "caption")
        .map(lineageVersionToFeedbackVersion);
      const visualPromptVersions = result.versions
        .filter((version) => version.artifactType === "visualPrompt")
        .map(lineageVersionToFeedbackVersion);
      const imageVersions = result.versions
        .filter((version) => version.artifactType === "image")
        .map(lineageVersionToFeedbackVersion);

      return [
        channel,
        serializeLineage({
          captionVersions,
          visualPromptVersions,
          imageVersions,
        }),
      ] as const;
    })
  );
  const hasDbLineage = entries.some(([, lineage]) => {
    return lineage.caption_versions.length || lineage.visual_prompt_versions.length || lineage.image_versions.length;
  });

  return hasDbLineage ? (Object.fromEntries(entries) as FeedbackFile) : null;
}

export async function readFeedbackFile(runId: string) {
  const feedbackPath = path.join(process.cwd(), "outputs", runId, "feedback.json");

  try {
    const dbFeedback = await readDbFeedback(runId);
    if (dbFeedback) {
      return {
        feedback: dbFeedback,
        feedbackPath
      };
    }
  } catch {
    // DB lineage may not exist for legacy/local-only runs; fall back to the compatibility mirror.
  }

  try {
    const parsedFeedback = JSON.parse(await readFile(feedbackPath, "utf8")) as unknown;

    if (!parsedFeedback || typeof parsedFeedback !== "object" || Array.isArray(parsedFeedback)) {
      return {
        feedback: emptyFeedbackFile(),
        feedbackPath
      };
    }

    const feedbackRecord = parsedFeedback as Partial<Record<ContentChannel, unknown>>;

    return {
      feedback: Object.fromEntries(
        feedbackChannels.map((channel) => [channel, serializeLineage(normalizeChannelLineage(feedbackRecord[channel]))])
      ) as FeedbackFile,
      feedbackPath
    };
  } catch {
    return {
      feedback: emptyFeedbackFile(),
      feedbackPath
    };
  }
}

export async function writeFeedbackFile(feedbackPath: string, feedback: FeedbackFile) {
  try {
    await writeFile(feedbackPath, `${JSON.stringify(feedback, null, 2)}\n`);
  } catch {
    // The filesystem mirror is optional in DB-first runtime.
  }
}

export async function appendImageVersion(runId: string, channel: ContentChannel, input: AppendImageVersionInput) {
  try {
    const artifact = await createLineageArtifact({
      legacyRunId: runId,
      channel,
      artifactType: "image",
      metadata: {
        image_path: input.imagePath,
        prompt_excerpt: input.promptExcerpt,
      },
    });
    const latest = await getFeedbackLineage({ legacyRunId: runId, channel });
    const sourceVisualPromptVersionId = latest?.versions
      .filter((version) => version.artifactType === "visualPrompt")
      .at(-1)?.id;
    const version = await appendLineageVersion({
      legacyRunId: runId,
      channel,
      artifactType: "image",
      generationArtifactId: artifact?.id ?? null,
      status: "pending",
      metadata: {
        generation_type: input.generationType,
        archetype: input.archetype ?? "",
        concept_angle: input.conceptAngle ?? "",
        prompt_excerpt: input.promptExcerpt,
        image_path: input.imagePath,
        parent_caption_version_id: input.parentCaptionVersionId ?? "",
        regeneration_index: latest?.versions.filter((item) => item.artifactType === "image").length ?? 0,
        source_visual_prompt_version_id: sourceVisualPromptVersionId ?? "",
      },
    });

    return lineageVersionToFeedbackVersion(version);
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback, feedbackPath } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);
  const version: FeedbackVersion = {
    id: versionId("image", lineage.imageVersions.length),
    createdAt: new Date().toISOString(),
    generationType: input.generationType,
    status: "pending",
    notes: "",
    ...(input.archetype ? { archetype: input.archetype } : {}),
    ...(input.conceptAngle ? { conceptAngle: input.conceptAngle } : {}),
    promptExcerpt: input.promptExcerpt,
    imagePath: input.imagePath,
    parentCaptionVersionId: input.parentCaptionVersionId,
    regenerationIndex: lineage.imageVersions.length,
    sourceVisualPromptVersionId: getCurrentVersionId(lineage, "visualPrompt")
  };

  lineage.imageVersions.push(version);
  feedback[channel] = serializeLineage(lineage);
  await writeFeedbackFile(feedbackPath, feedback);

  return version;
}

export async function appendCaptionVersion(runId: string, channel: ContentChannel, input: AppendCaptionVersionInput) {
  try {
    const artifact = await createLineageArtifact({
      legacyRunId: runId,
      channel,
      artifactType: "caption",
      content: input.caption,
      metadata: {
        caption_excerpt: excerpt(input.caption),
      },
    });
    const latest = await getFeedbackLineage({ legacyRunId: runId, channel });
    const version = await appendLineageVersion({
      legacyRunId: runId,
      channel,
      artifactType: "caption",
      generationArtifactId: artifact?.id ?? null,
      content: input.caption,
      status: "pending",
      metadata: {
        generation_type: input.generationType,
        caption_excerpt: excerpt(input.caption),
        regeneration_index: latest?.versions.filter((item) => item.artifactType === "caption").length ?? 0,
      },
    });

    return lineageVersionToFeedbackVersion(version);
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback, feedbackPath } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);
  const version: FeedbackVersion = {
    id: versionId("caption", lineage.captionVersions.length),
    createdAt: new Date().toISOString(),
    generationType: input.generationType,
    status: "pending",
    notes: "",
    captionExcerpt: excerpt(input.caption),
    regenerationIndex: lineage.captionVersions.length,
    text: input.caption
  };

  lineage.captionVersions.push(version);
  feedback[channel] = serializeLineage(lineage);
  await writeFeedbackFile(feedbackPath, feedback);

  return version;
}

export async function appendVisualPromptVersion(runId: string, channel: ContentChannel, input: AppendVisualPromptVersionInput) {
  try {
    const artifact = await createLineageArtifact({
      legacyRunId: runId,
      channel,
      artifactType: "visualPrompt",
      content: input.visualPrompt,
      metadata: {
        prompt_excerpt: excerpt(input.visualPrompt),
      },
    });
    const version = await appendLineageVersion({
      legacyRunId: runId,
      channel,
      artifactType: "visualPrompt",
      generationArtifactId: artifact?.id ?? null,
      content: input.visualPrompt,
      status: "pending",
      metadata: {
        generation_type: input.generationType,
        prompt_excerpt: excerpt(input.visualPrompt),
      },
    });

    return lineageVersionToFeedbackVersion(version);
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback, feedbackPath } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);
  const version: FeedbackVersion = {
    id: versionId("visualPrompt", lineage.visualPromptVersions.length),
    createdAt: new Date().toISOString(),
    generationType: input.generationType,
    status: "pending",
    notes: "",
    promptExcerpt: excerpt(input.visualPrompt),
    text: input.visualPrompt
  };

  lineage.visualPromptVersions.push(version);
  feedback[channel] = serializeLineage(lineage);
  await writeFeedbackFile(feedbackPath, feedback);

  return version;
}

export async function ensureCaptionVersion(runId: string, channel: ContentChannel, caption: string) {
  try {
    const current = await getFeedbackLineage({ legacyRunId: runId, channel });
    const latestCaption = current?.versions.filter((version) => version.artifactType === "caption").at(-1);
    const latestText = typeof latestCaption?.metadata.text === "string" ? latestCaption.metadata.text : "";

    if (!latestCaption || (caption && latestText && latestText !== caption)) {
      return appendCaptionVersion(runId, channel, {
        caption,
        generationType: latestCaption ? "regenerate" : "initial",
      });
    }

    return lineageVersionToFeedbackVersion(latestCaption);
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback, feedbackPath } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);

  const latestCaption = lineage.captionVersions.at(-1);

  if (!lineage.captionVersions.length || (caption && latestCaption?.text && latestCaption.text !== caption)) {
    lineage.captionVersions.push({
      id: versionId("caption", lineage.captionVersions.length),
      createdAt: new Date().toISOString(),
      generationType: lineage.captionVersions.length ? "regenerate" : "initial",
      status: "pending",
      notes: "",
      captionExcerpt: excerpt(caption),
      regenerationIndex: lineage.captionVersions.length,
      text: caption
    });
    feedback[channel] = serializeLineage(lineage);
    await writeFeedbackFile(feedbackPath, feedback);
  }

  return lineage.captionVersions.at(-1);
}

export async function ensureVisualPromptVersion(runId: string, channel: ContentChannel, visualPrompt: string) {
  try {
    const current = await getFeedbackLineage({ legacyRunId: runId, channel });
    const latestVisualPrompt = current?.versions.filter((version) => version.artifactType === "visualPrompt").at(-1);
    const latestText = typeof latestVisualPrompt?.metadata.text === "string" ? latestVisualPrompt.metadata.text : "";

    if (!latestVisualPrompt || (visualPrompt && latestText && latestText !== visualPrompt)) {
      return appendVisualPromptVersion(runId, channel, {
        visualPrompt,
        generationType: latestVisualPrompt ? "regenerate" : "initial",
      });
    }

    return lineageVersionToFeedbackVersion(latestVisualPrompt);
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback, feedbackPath } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);

  const latestVisualPrompt = lineage.visualPromptVersions.at(-1);

  if (
    !lineage.visualPromptVersions.length ||
    (visualPrompt && latestVisualPrompt?.text && latestVisualPrompt.text !== visualPrompt)
  ) {
    lineage.visualPromptVersions.push({
      id: versionId("visualPrompt", lineage.visualPromptVersions.length),
      createdAt: new Date().toISOString(),
      generationType: lineage.visualPromptVersions.length ? "regenerate" : "initial",
      status: "pending",
      notes: "",
      promptExcerpt: excerpt(visualPrompt),
      text: visualPrompt
    });
    feedback[channel] = serializeLineage(lineage);
    await writeFeedbackFile(feedbackPath, feedback);
  }

  return lineage.visualPromptVersions.at(-1);
}

export async function updateVersionFeedback({
  channel,
  notes,
  runId,
  status,
  tags,
  target,
  versionId: requestedVersionId
}: {
  channel: ContentChannel;
  notes: string;
  runId: string;
  status: FeedbackStatus;
  tags?: string[];
  target: FeedbackTarget;
  versionId?: string;
}) {
  try {
    const current = await getFeedbackLineage({ legacyRunId: runId, channel });
    const versions =
      target === "caption"
        ? current?.versions.filter((version) => version.artifactType === "caption")
        : target === "visualPrompt"
          ? current?.versions.filter((version) => version.artifactType === "visualPrompt")
          : current?.versions.filter((version) => version.artifactType === "image");
    const dbVersion =
      versions?.find((candidate) => candidate.id === requestedVersionId) ??
      versions?.find((candidate) => candidate.metadata.legacy_version_id === requestedVersionId) ??
      versions?.at(-1);

    if (dbVersion) {
      const updated = await updateLineageVersionFeedback({
        versionId: dbVersion.id,
        status,
        notes,
        tags,
      });

      if (updated) return lineageVersionToFeedbackVersion(updated);
    }
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback, feedbackPath } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);
  const versions =
    target === "caption"
      ? lineage.captionVersions
      : target === "visualPrompt"
      ? lineage.visualPromptVersions
      : lineage.imageVersions;

  if (!versions.length) {
    versions.push({
      id: versionId(target, 0),
      createdAt: new Date().toISOString(),
      generationType: "initial",
      status: "pending",
      notes: ""
    });
  }

  const version = versions.find((candidate) => candidate.id === requestedVersionId) ?? versions.at(-1);

  if (!version) {
    throw new Error("No feedback version found.");
  }

  version.status = status;
  version.notes = notes;
  version.updatedAt = new Date().toISOString();
  if (tags?.length) version.tags = tags;

  feedback[channel] = serializeLineage(lineage);
  await writeFeedbackFile(feedbackPath, feedback);

  return version;
}

export async function getApprovedCaptionVersion(runId: string, channel: ContentChannel) {
  try {
    const current = await getFeedbackLineage({ legacyRunId: runId, channel });
    const latestCaption = current?.versions.filter((version) => version.artifactType === "caption").at(-1);
    if (latestCaption?.status === "approved") {
      return lineageVersionToFeedbackVersion(latestCaption);
    }
  } catch {
    // Fall back to the optional local mirror for legacy/offline runs.
  }

  const { feedback } = await readFeedbackFile(runId);
  const lineage = normalizeChannelLineage(feedback[channel]);
  const latestCaption = lineage.captionVersions.at(-1);

  return latestCaption?.status === "approved" ? latestCaption : undefined;
}
