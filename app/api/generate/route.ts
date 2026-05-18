import { execFile } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { channels, getChannelPath, readTextFile } from "@/lib/channel-image-generation";
import { ensureCaptionVersion, ensureVisualPromptVersion } from "@/lib/feedback-lineage";
import {
  createGenerationArtifact,
  createGenerationRun,
  upsertGenerationChannel,
} from "@/lib/db/generation-runs-db";
import { uploadArtifactText, uploadJsonSnapshot } from "@/lib/storage/generation-storage";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

type ExecFileError = Error & {
  stderr?: string;
  stdout?: string;
  code?: number | string;
};

function getProjectPythonPath(cwd: string) {
  const venvDirectory = `.${"venv"}`;
  return [cwd, venvDirectory, "bin", "python"].join(path.sep);
}

function extractRunId(stdout: string) {
  const match = stdout.match(/outputs\/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { idea?: unknown };
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";

  if (!idea) {
    return NextResponse.json({ error: "Raw idea is required." }, { status: 400 });
  }

  const cwd = process.cwd();
  const inputPath = path.join(cwd, "inputs", "raw-idea.txt");
  const pythonCommand = process.env.PYTHON_BIN ?? getProjectPythonPath(cwd);

  try {
    await mkdir(path.dirname(inputPath), { recursive: true });
    await writeFile(inputPath, idea, "utf8");

    const { stdout, stderr } = await execFileAsync(pythonCommand, ["agent.py"], {
      cwd,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
      timeout: 1000 * 60 * 3
    });

    if (stderr) {
      console.warn("[generate] Python stderr:", stderr);
    }

    const runId = extractRunId(stdout);

    if (runId) {
      const persistedRun = await createGenerationRun({
        legacyRunId: runId,
        title: idea.slice(0, 120),
        rawIdea: idea,
        status: "completed",
        source: "api_generate",
        completedAt: new Date().toISOString(),
        metadata: {
          stdout_excerpt: stdout.slice(0, 2000),
          stderr_excerpt: stderr?.slice(0, 2000) ?? "",
        },
      }).catch((error) => {
        console.error("[generate] DB run persistence failed", {
          runId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      });

      await Promise.all(
        channels.map(async (channel) => {
          const caption = await readTextFile(path.join(getChannelPath(runId, channel), "caption.txt"));
          const visualPrompt = await readTextFile(path.join(getChannelPath(runId, channel), "visual_prompt.txt"));
          const channelRow = persistedRun
            ? await upsertGenerationChannel({
                runId: persistedRun.id,
                channel,
                status: "completed",
                caption: caption || null,
                visualPrompt: visualPrompt || null,
                metadata: { legacy_run_id: runId, generation_type: "initial" },
              }).catch((error) => {
                console.error("[generate] Channel persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
                return null;
              })
            : null;

          if (caption) {
            const version = await ensureCaptionVersion(runId, channel, caption);

            if (persistedRun && channelRow) {
              const artifact = await createGenerationArtifact({
                runId: persistedRun.id,
                channelId: channelRow.id,
                artifactType: "caption",
                version: 1,
                content: caption,
                metadata: {
                  legacy_run_id: runId,
                  channel,
                  caption_version_id: version?.id ?? null,
                  generation_type: "initial",
                },
              }).catch((error) => {
                console.error("[generate] Caption artifact persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
                return null;
              });

              await uploadArtifactText({
                generationRunId: persistedRun.id,
                generationChannelId: channelRow.id,
                channel,
                filename: "caption.txt",
                content: caption,
                artifactId: artifact?.id ?? null,
                assetType: "caption_text",
                metadata: {
                  legacy_run_id: runId,
                  caption_version_id: version?.id ?? null,
                  generation_type: "initial",
                },
              }).catch((error) => {
                console.error("[generate] Caption storage persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              });

              await uploadJsonSnapshot({
                generationRunId: persistedRun.id,
                generationChannelId: channelRow.id,
                channel,
                snapshotType: "caption",
                filename: "caption.json",
                content: {
                  caption,
                  caption_version_id: version?.id ?? null,
                  generation_type: "initial",
                },
              }).catch((error) => {
                console.error("[generate] Caption snapshot persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              });
            }
          }

          if (visualPrompt) {
            const version = await ensureVisualPromptVersion(runId, channel, visualPrompt);

            if (persistedRun && channelRow) {
              const artifact = await createGenerationArtifact({
                runId: persistedRun.id,
                channelId: channelRow.id,
                artifactType: "visual_prompt",
                version: 1,
                content: visualPrompt,
                metadata: {
                  legacy_run_id: runId,
                  channel,
                  visual_prompt_version_id: version?.id ?? null,
                  generation_type: "initial",
                },
              }).catch((error) => {
                console.error("[generate] Visual prompt artifact persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
                return null;
              });

              await uploadArtifactText({
                generationRunId: persistedRun.id,
                generationChannelId: channelRow.id,
                channel,
                filename: "visual_prompt.txt",
                content: visualPrompt,
                artifactId: artifact?.id ?? null,
                assetType: "visual_prompt_text",
                metadata: {
                  legacy_run_id: runId,
                  visual_prompt_version_id: version?.id ?? null,
                  generation_type: "initial",
                },
              }).catch((error) => {
                console.error("[generate] Visual prompt storage persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              });

              await uploadJsonSnapshot({
                generationRunId: persistedRun.id,
                generationChannelId: channelRow.id,
                channel,
                snapshotType: "visual_prompt",
                filename: "visual_prompt.json",
                content: {
                  visual_prompt: visualPrompt,
                  visual_prompt_version_id: version?.id ?? null,
                  generation_type: "initial",
                },
              }).catch((error) => {
                console.error("[generate] Visual prompt snapshot persistence failed", {
                  runId,
                  channel,
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              });
            }
          }
        })
      );

      const rawMeta = await readTextFile(path.join(process.cwd(), "outputs", runId, "meta.json"));
      if (rawMeta) {
        try {
          await uploadJsonSnapshot({
            legacyRunId: runId,
            snapshotType: "meta",
            filename: "meta.json",
            content: JSON.parse(rawMeta) as Record<string, unknown>,
          });
        } catch (error) {
          console.error("[generate] Meta snapshot persistence failed", {
            runId,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      runId,
      stdout,
      stderr
    });
  } catch (error) {
    const execError = error as ExecFileError;
    const message = execError.message ?? "Generation failed.";
    const stderr = execError.stderr ?? "";
    const stdout = execError.stdout ?? "";

    console.error("[generate] Python execution failed", {
      pythonCommand,
      cwd,
      code: execError.code,
      message,
      stderr,
      stdout
    });

    return NextResponse.json(
      {
        error: message,
        stderr,
        stdout,
        pythonCommand
      },
      { status: 500 }
    );
  }
}
