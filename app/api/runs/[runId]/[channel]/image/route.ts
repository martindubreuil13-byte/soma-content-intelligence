import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  generateImageFromPrompt,
  getChannelPath,
  imageFileName,
  isChannel,
  normalizeVisualTweak,
  readRunMetadata,
  readTextFile,
  validateRunChannel
} from "@/lib/channel-image-generation";
import { getApprovedCaptionVersion } from "@/lib/feedback-lineage";
import { runInlineExecutionJob } from "@/lib/orchestration/execution-orchestrator";
import { getSignedImageUrl } from "@/lib/storage/generation-storage";

type RouteContext = {
  params: Promise<{
    runId: string;
    channel: string;
  }>;
};

type ImageRequest = {
  visualTweak?: unknown;
};

export async function GET(request: Request, context: RouteContext) {
  const { runId, channel } = await context.params;
  const validationError = validateRunChannel(runId, channel);

  if (validationError || !isChannel(channel)) {
    return NextResponse.json({ error: validationError ?? "Invalid channel." }, { status: 400 });
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedFile = searchParams.get("file") ?? imageFileName;
  const safeFile = /^generated-image(?:-[\dTZ-]+)?\.png$/.test(requestedFile) ? requestedFile : imageFileName;
  const imagePath = path.join(getChannelPath(runId, channel), safeFile);
  const download = searchParams.get("download") === "1";

  if (!download) {
    const signedUrl = await getSignedImageUrl({
      legacyRunId: runId,
      channel,
      filename: safeFile,
    }).catch((error) => {
      console.error("[image] Signed storage URL lookup failed", {
        runId,
        channel,
        file: safeFile,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    });

    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }
  }

  try {
    const image = await readFile(imagePath);

    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="soma-${channel}-${runId}.png"`
            }
          : {})
      }
    });
  } catch {
    return NextResponse.json({ error: "Generated image not found." }, { status: 404 });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { runId, channel } = await context.params;
  const validationError = validateRunChannel(runId, channel);

  if (validationError || !isChannel(channel)) {
    return NextResponse.json({ error: validationError ?? "Invalid channel." }, { status: 400 });
  }

  return runInlineExecutionJob(
    {
      jobType: "image_generation",
      payload: { runId, channel },
      priority: 70,
    },
    async () => {
  try {
    const requestBody = (await _request.json().catch(() => ({}))) as ImageRequest;
    const visualTweak = normalizeVisualTweak(requestBody.visualTweak);
    const visualPromptPath = path.join(getChannelPath(runId, channel), "visual_prompt.txt");
    const visualPrompt = await readTextFile(visualPromptPath);
    const approvedCaption = await getApprovedCaptionVersion(runId, channel);

    if (!approvedCaption) {
      throw Object.assign(new Error("Approve the latest caption before generating an image."), { status: 409 });
    }

    if (!visualPrompt) {
      throw Object.assign(new Error("visual_prompt.txt is empty."), { status: 400 });
    }

    const imagePath = path.join(getChannelPath(runId, channel), imageFileName);
    const imageAlreadyExists = await stat(imagePath)
      .then((fileStat) => fileStat.isFile())
      .catch(() => false);
    const metadata = await readRunMetadata(runId);
    const generated = await generateImageFromPrompt({
      channel,
      conceptAngle: metadata.concept_angles?.[channel],
      generationType: imageAlreadyExists ? "regenerate" : "initial",
      parentCaptionText: approvedCaption.text ?? approvedCaption.captionExcerpt ?? "",
      parentCaptionVersionId: approvedCaption.id,
      runId,
      visualArchetype: metadata.visual_archetypes?.[channel],
      visualTweak,
      visualPrompt
    });

    return {
      ok: true,
      runId,
      channel,
      visualPrompt,
      reimagined: false,
      ...generated
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";

    console.error("[image] Generation failed", {
      runId,
      channel,
      message
    });

    throw Object.assign(new Error(message), { status: error && typeof error === "object" && "status" in error ? error.status : 500 });
  }
    }
  )
    .then(({ job, result }) => NextResponse.json({ ...result, executionJobId: job.id, executionStatus: job.status }))
    .catch((error) => {
      const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;
      return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed." }, { status });
    });
}
