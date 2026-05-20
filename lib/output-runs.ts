import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { containsMultipleChannelHeadings, splitContentByChannel } from "@/lib/content-formatting";
import { listGenerationAssets } from "@/lib/db/generation-assets-db";
import {
  listGenerationArtifacts,
  listGenerationChannels,
  listGenerationRuns,
  type GenerationArtifact,
  type GenerationChannel,
  type GenerationRun,
} from "@/lib/db/generation-runs-db";
import {
  getFeedbackLineage,
  lineageVersionToFeedbackVersion,
  type FeedbackLineageVersion,
} from "@/lib/db/feedback-lineage-db";
import {
  currentFeedbackFromLineage,
  getCurrentVersionId,
  normalizeChannelLineage
} from "@/lib/feedback-lineage";
import type {
  ChannelFeedbackLineage,
  ContentChannel,
  ContentPackage,
  ContentRun
} from "@/lib/content-types";

const outputFolderPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
const missingOriginalIdeaMessage = "No original idea saved for this run.";

const channels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];
const neutralFeedbackLineage: ChannelFeedbackLineage = {
  captionVersions: [],
  visualPromptVersions: [],
  imageVersions: []
};
const legacyChannelFiles: Record<ContentChannel, string> = {
  linkedin: "linkedin.txt",
  facebook: "facebook.txt",
  instagram: "instagram.txt",
  tiktok: "tiktok.txt"
};

function formatTimestamp(folderName: string) {
  const [date, time] = folderName.split("_");
  return `${date} ${time.replaceAll("-", ":")}`;
}

async function readChannelFile(runPath: string, fileName: string) {
  try {
    return (await readFile(path.join(runPath, fileName), "utf8")).trim();
  } catch {
    return "";
  }
}

async function readGeneratedImageMeta(runPath: string, channel: ContentChannel) {
  const imagePath = path.join(runPath, channel, "generated-image.png");

  try {
    const imageStat = await stat(imagePath);

    return {
      imageUrl: `/api/runs/${encodeURIComponent(path.basename(runPath))}/${channel}/image?t=${imageStat.mtimeMs}`,
      imageUpdatedAt: imageStat.mtimeMs
    };
  } catch {
    return {};
  }
}

async function readOriginalIdea(runPath: string) {
  try {
    const meta = JSON.parse(await readFile(path.join(runPath, "meta.json"), "utf8")) as {
      original_idea?: unknown;
    };
    const originalIdea = typeof meta.original_idea === "string" ? meta.original_idea.trim() : "";

    if (originalIdea) {
      return {
        originalIdea,
        hasOriginalIdea: true
      };
    }
  } catch {
    // Older runs may not have meta.json, and malformed metadata should not break the dashboard.
  }

  return {
    originalIdea: missingOriginalIdeaMessage,
    hasOriginalIdea: false
  };
}

async function readFeedback(runPath: string): Promise<Record<ContentChannel, ChannelFeedbackLineage>> {
  const fallback = Object.fromEntries(channels.map((channel) => [channel, neutralFeedbackLineage])) as Record<
    ContentChannel,
    ChannelFeedbackLineage
  >;

  try {
    const parsedFeedback = JSON.parse(await readFile(path.join(runPath, "feedback.json"), "utf8")) as unknown;

    if (!parsedFeedback || typeof parsedFeedback !== "object" || Array.isArray(parsedFeedback)) {
      return fallback;
    }

    const feedbackRecord = parsedFeedback as Record<string, unknown>;

    return Object.fromEntries(
      channels.map((channel) => {
        return [channel, normalizeChannelLineage(feedbackRecord[channel])];
      })
    ) as Record<ContentChannel, ChannelFeedbackLineage>;
  } catch {
    return fallback;
  }
}

function isContentPackage(value: unknown): value is { caption?: unknown; visual_prompt?: unknown } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function lineageFromDbVersions(versions: FeedbackLineageVersion[]): ChannelFeedbackLineage {
  return {
    captionVersions: versions
      .filter((version) => version.artifactType === "caption")
      .map(lineageVersionToFeedbackVersion),
    visualPromptVersions: versions
      .filter((version) => version.artifactType === "visualPrompt")
      .map(lineageVersionToFeedbackVersion),
    imageVersions: versions
      .filter((version) => version.artifactType === "image")
      .map(lineageVersionToFeedbackVersion),
  };
}

function latestArtifactContent(artifacts: GenerationArtifact[], channel: GenerationChannel | undefined, type: string) {
  return artifacts
    .filter((artifact) => artifact.artifactType === type && (!channel || artifact.channelId === channel.id))
    .at(-1)?.content ?? "";
}

async function readDbRun(run: GenerationRun): Promise<ContentRun> {
  const [dbChannels, artifacts, assets] = await Promise.all([
    listGenerationChannels(run.id),
    listGenerationArtifacts(run.id),
    listGenerationAssets({ generationRunId: run.id, assetType: "generated_image" }).catch(() => []),
  ]);
  const channelPackages = Object.fromEntries(
    await Promise.all(
      channels.map(async (channel) => {
        const dbChannel = dbChannels.find((item) => item.channel === channel);
        const dbLineage = await getFeedbackLineage({ generationRunId: run.id, channel }).catch(() => null);
        const feedbackLineage = dbLineage ? lineageFromDbVersions(dbLineage.versions) : neutralFeedbackLineage;
        const imageAsset = assets.find((asset) => asset.generationChannelId === dbChannel?.id);
        const caption =
          dbChannel?.caption ||
          latestArtifactContent(artifacts, dbChannel, "caption") ||
          "";
        const visualPrompt =
          dbChannel?.visualPrompt ||
          latestArtifactContent(artifacts, dbChannel, "visual_prompt") ||
          "";

        return [
          channel,
          {
            caption,
            currentCaptionVersionId: getCurrentVersionId(feedbackLineage, "caption"),
            currentVisualPromptVersionId: getCurrentVersionId(feedbackLineage, "visualPrompt"),
            currentImageVersionId: getCurrentVersionId(feedbackLineage, "image"),
            feedback: currentFeedbackFromLineage(feedbackLineage),
            feedbackLineage,
            visualPrompt,
            ...(imageAsset || dbChannel?.imageUrl
              ? { imageUrl: dbChannel?.imageUrl ?? `/api/runs/${encodeURIComponent(run.legacyRunId ?? run.id)}/${channel}/image` }
              : {}),
          },
        ];
      })
    )
  ) as Record<ContentChannel, ContentPackage>;

  return {
    id: run.legacyRunId ?? run.id,
    folderName: run.legacyRunId ?? run.id,
    timestamp: run.createdAt,
    title: run.title ?? "Generated content run",
    mood: run.status,
    originalIdea: run.rawIdea ?? missingOriginalIdeaMessage,
    hasOriginalIdea: Boolean(run.rawIdea),
    channels: channelPackages,
  };
}

async function readRun(folderName: string): Promise<ContentRun> {
  const runPath = path.join(process.cwd(), "outputs", folderName);
  const originalIdeaMeta = await readOriginalIdea(runPath);
  const fullOutput = await readChannelFile(runPath, "content-output.txt");
  const legacyVisualPrompt = await readChannelFile(runPath, "visual.txt");
  const feedback = await readFeedback(runPath);
  let structuredSections: Partial<Record<ContentChannel, ContentPackage>> = {};
  let legacyStructuredCaptions: Partial<Record<ContentChannel, string>> = {};
  let structuredVisualPrompt = "";

  try {
    const parsedOutput = fullOutput ? JSON.parse(fullOutput) : null;

    if (parsedOutput && typeof parsedOutput === "object" && !Array.isArray(parsedOutput)) {
      const parsedRecord = parsedOutput as Record<string, unknown>;

      structuredSections = Object.fromEntries(
        channels.map((channel) => {
          const packageValue = parsedRecord[channel];

          if (!isContentPackage(packageValue)) {
            return [
              channel,
              {
                caption: "",
                currentCaptionVersionId: undefined,
                currentVisualPromptVersionId: undefined,
                currentImageVersionId: undefined,
                feedback: currentFeedbackFromLineage(neutralFeedbackLineage),
                feedbackLineage: neutralFeedbackLineage,
                visualPrompt: ""
              }
            ];
          }

          return [
            channel,
            {
              caption: getString(packageValue.caption),
              currentCaptionVersionId: undefined,
              currentVisualPromptVersionId: undefined,
              currentImageVersionId: undefined,
              feedback: currentFeedbackFromLineage(neutralFeedbackLineage),
              feedbackLineage: neutralFeedbackLineage,
              visualPrompt: getString(packageValue.visual_prompt)
            }
          ];
        })
      ) as Partial<Record<ContentChannel, ContentPackage>>;

      legacyStructuredCaptions = Object.fromEntries(
        channels.map((channel) => [channel, getString(parsedRecord[channel])])
      ) as Partial<Record<ContentChannel, string>>;

      structuredVisualPrompt = getString(parsedRecord.visual);
    }
  } catch {
    structuredSections = {};
  }

  const legacyCaptions = Object.fromEntries(
    await Promise.all(
      channels.map(async (channel) => [channel, await readChannelFile(runPath, legacyChannelFiles[channel])])
    )
  ) as Record<ContentChannel, string>;

  const splitSource = fullOutput || Object.values(legacyCaptions).find(containsMultipleChannelHeadings) || "";
  const splitSections = splitSource ? splitContentByChannel(splitSource) : {};

  const channelPackages = Object.fromEntries(
    await Promise.all(
      channels.map(async (channel) => {
        const packageFromFiles: ContentPackage = {
          caption: await readChannelFile(path.join(runPath, channel), "caption.txt"),
          visualPrompt: await readChannelFile(path.join(runPath, channel), "visual_prompt.txt"),
          currentCaptionVersionId: getCurrentVersionId(feedback[channel], "caption"),
          currentVisualPromptVersionId: getCurrentVersionId(feedback[channel], "visualPrompt"),
          currentImageVersionId: getCurrentVersionId(feedback[channel], "image"),
          feedback: currentFeedbackFromLineage(feedback[channel]),
          feedbackLineage: feedback[channel]
        };
        let caption =
          packageFromFiles.caption ||
          structuredSections[channel]?.caption ||
          legacyStructuredCaptions[channel] ||
          legacyCaptions[channel] ||
          splitSections[channel] ||
          "";

        if (caption && containsMultipleChannelHeadings(caption)) {
          caption = splitSections[channel] ?? "";
        }

        const visualPrompt =
          packageFromFiles.visualPrompt ||
          structuredSections[channel]?.visualPrompt ||
          structuredVisualPrompt ||
          legacyVisualPrompt ||
          "";
        const imageMeta = await readGeneratedImageMeta(runPath, channel);

        return [
          channel,
          {
            caption,
            currentCaptionVersionId: getCurrentVersionId(feedback[channel], "caption"),
            currentVisualPromptVersionId: getCurrentVersionId(feedback[channel], "visualPrompt"),
            currentImageVersionId: getCurrentVersionId(feedback[channel], "image"),
            feedback: currentFeedbackFromLineage(feedback[channel]),
            feedbackLineage: feedback[channel],
            visualPrompt,
            ...imageMeta
          }
        ];
      })
    )
  ) as Record<ContentChannel, ContentPackage>;

  channels.forEach((channel) => {
    if (!channelPackages[channel].caption && splitSections[channel]) {
      channelPackages[channel].caption = splitSections[channel] ?? "";
    }
  });

  return {
    id: folderName,
    folderName,
    timestamp: formatTimestamp(folderName),
    title: "Generated content run",
    mood: "Local filesystem output",
    ...originalIdeaMeta,
    channels: channelPackages
  };
}

export async function getContentRuns(options: { includeLegacyFallback?: boolean } = {}): Promise<ContentRun[]> {
  const includeLegacyFallback = options.includeLegacyFallback ?? true;

  try {
    const dbRuns = await listGenerationRuns();
    if (dbRuns.length) {
      return Promise.all(dbRuns.map(readDbRun));
    }
  } catch {
    // Fall back to local outputs for legacy/dev compatibility.
  }

  if (!includeLegacyFallback) {
    return [];
  }

  const outputPath = path.join(process.cwd(), "outputs");

  try {
    const entries = await readdir(outputPath, { withFileTypes: true });
    const folderNames = entries
      .filter((entry) => entry.isDirectory() && outputFolderPattern.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    return Promise.all(folderNames.map(readRun));
  } catch {
    return [];
  }
}
