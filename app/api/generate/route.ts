import { execFile } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { channels, getChannelPath, readTextFile } from "@/lib/channel-image-generation";
import { ensureCaptionVersion, ensureVisualPromptVersion } from "@/lib/feedback-lineage";

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
      await Promise.all(
        channels.map(async (channel) => {
          const caption = await readTextFile(path.join(getChannelPath(runId, channel), "caption.txt"));
          const visualPrompt = await readTextFile(path.join(getChannelPath(runId, channel), "visual_prompt.txt"));

          if (caption) {
            await ensureCaptionVersion(runId, channel, caption);
          }

          if (visualPrompt) {
            await ensureVisualPromptVersion(runId, channel, visualPrompt);
          }
        })
      );
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
