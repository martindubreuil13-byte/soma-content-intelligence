import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import type { ContentChannel, FeedbackTarget } from "@/lib/content-types";
import { appendPersistentLearningSignal, createLearningEvent } from "@/lib/agent-training";
import { getChannelPath, isChannel, readTextFile, validateRunChannel } from "@/lib/channel-image-generation";
import {
  ensureCaptionVersion,
  ensureVisualPromptVersion,
  isFeedbackStatus,
  readFeedbackFile,
  updateVersionFeedback
} from "@/lib/feedback-lineage";
import { rebuildPreferenceMemory } from "@/lib/preference-memory";
import { upsertWinningPattern, appendEditDelta } from "@/lib/brand-intelligence";
import {
  createFeedbackEvent,
  createGenerationRun,
  upsertGenerationChannel,
} from "@/lib/db/generation-runs-db";
import { uploadJsonSnapshot } from "@/lib/storage/generation-storage";

type RouteContext = {
  params: Promise<{
    runId: string;
    channel: string;
  }>;
};

type FeedbackRequest = {
  notes?: unknown;
  status?: unknown;
  target?: unknown;
  versionId?: unknown;
  tags?: unknown;
  editedCaption?: unknown;
};

function isFeedbackTarget(value: unknown): value is FeedbackTarget {
  return value === "caption" || value === "visualPrompt" || value === "image";
}

type GenerationChannelContext = {
  active_icp_ids?: string[];
  active_angle_ids?: string[];
  active_hook_ids?: string[];
  active_cta_ids?: string[];
};

async function readGenerationContext(runId: string, channel: string): Promise<GenerationChannelContext | null> {
  try {
    const metaPath = path.join(process.cwd(), "outputs", runId, "meta.json");
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as Record<string, unknown>;
    const generationContext = meta.generation_context as Record<string, unknown> | undefined;
    const channelCtx = generationContext?.[channel] as GenerationChannelContext | undefined;
    return channelCtx ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { runId, channel } = await context.params;
  const validationError = validateRunChannel(runId, channel);

  if (validationError || !isChannel(channel)) {
    return NextResponse.json({ error: validationError ?? "Invalid channel." }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as FeedbackRequest;
    const target = isFeedbackTarget(body.target) ? body.target : "caption";
    const status = isFeedbackStatus(body.status) ? body.status : "pending";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : "";
    const versionId = typeof body.versionId === "string" ? body.versionId.trim() : undefined;
    const tags = Array.isArray(body.tags) ? (body.tags as unknown[]).filter((t) => typeof t === "string") as string[] : [];
    const editedCaption = typeof body.editedCaption === "string" ? body.editedCaption.trim() : undefined;

    if (target === "caption") {
      const caption = await readTextFile(path.join(getChannelPath(runId, channel), "caption.txt"));
      await ensureCaptionVersion(runId, channel, caption);
    }

    if (target === "visualPrompt") {
      const visualPrompt = await readTextFile(path.join(getChannelPath(runId, channel), "visual_prompt.txt"));
      await ensureVisualPromptVersion(runId, channel, visualPrompt);
    }

    const version = await updateVersionFeedback({
      channel,
      notes,
      runId,
      status,
      tags,
      target,
      versionId
    });

    await createGenerationRun({
      legacyRunId: runId,
      status: "completed",
      source: "feedback",
      completedAt: new Date().toISOString(),
    })
      .then(async (run) => {
        const channelRow = await upsertGenerationChannel({
          runId: run.id,
          channel,
          status: "feedback_received",
          metadata: {
            legacy_run_id: runId,
          },
        });

        await createFeedbackEvent({
          runId: run.id,
          channelId: channelRow.id,
          targetType: target,
          feedbackType: "operator_feedback",
          status: version.status,
          notes,
          tags,
          metadata: {
            legacy_run_id: runId,
            channel,
            version_id: version.id,
            requested_version_id: versionId ?? null,
          },
        });

        const { feedback } = await readFeedbackFile(runId);
        await uploadJsonSnapshot({
          generationRunId: run.id,
          generationChannelId: channelRow.id,
          channel,
          snapshotType: "feedback",
          filename: "feedback.json",
          content: feedback as Record<string, unknown>,
        });
      })
      .catch((error) => {
        console.error("[feedback] DB persistence failed", {
          runId,
          channel,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });

    if ((target === "caption" || target === "image") && (version.status === "approved" || version.status === "rejected")) {
      await appendPersistentLearningSignal(createLearningEvent({ action: version.status, artifactType: target, channel, runId, version }));
    }

    // WinningPattern tracking — use generation context written during caption regeneration
    if ((target === "caption" || target === "image") && (version.status === "approved" || version.status === "rejected")) {
      try {
        const genCtx = await readGenerationContext(runId, channel);
        const icpId = genCtx?.active_icp_ids?.[0];
        const angleId = genCtx?.active_angle_ids?.[0];
        const hookStyleId = genCtx?.active_hook_ids?.[0];
        const ctaStyleId = genCtx?.active_cta_ids?.[0];

        if (icpId && angleId && hookStyleId) {
          const isFirstPass = (version.regenerationIndex ?? 0) === 0;
          await upsertWinningPattern(
            { platform: channel as ContentChannel, icpId, angleId, hookStyleId, ctaStyleId },
            {
              approved: version.status === "approved",
              rejected: version.status === "rejected",
              firstPass: isFirstPass
            }
          );
        }
      } catch {
        // Fail gracefully — WinningPattern tracking must never break feedback submission
      }
    }

    // Edit delta tracking — record if an edited caption was provided alongside the feedback
    if (editedCaption && target === "caption") {
      try {
        const currentCaption = (await readTextFile(path.join(getChannelPath(runId, channel), "caption.txt"))).trim();
        if (currentCaption && editedCaption !== currentCaption) {
          await appendEditDelta({
            runId,
            channel: channel as ContentChannel,
            artifactType: "caption",
            versionId: version.id,
            originalText: currentCaption,
            editedText: editedCaption,
            editedAt: new Date().toISOString()
          });
        }
      } catch {
        // Fail gracefully — edit delta tracking must never break feedback submission
      }
    }

    let preferencesUpdated = true;

    try {
      await rebuildPreferenceMemory();
    } catch (error) {
      preferencesUpdated = false;
      console.error("[feedback] Preference synthesis failed", {
        runId,
        channel,
        message: error instanceof Error ? error.message : "Preference synthesis failed."
      });
    }

    return NextResponse.json({
      ok: true,
      runId,
      channel,
      target,
      versionId: version.id,
      tags,
      preferencesUpdated,
      feedback: {
        status: version.status,
        notes: version.notes,
        updatedAt: version.updatedAt
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback save failed.";

    console.error("[feedback] Save failed", {
      runId,
      channel,
      message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
