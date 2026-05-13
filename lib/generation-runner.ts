import { execFile } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { channels, getChannelPath, readTextFile } from "@/lib/channel-image-generation";
import { ensureCaptionVersion, ensureVisualPromptVersion } from "@/lib/feedback-lineage";

const execFileAsync = promisify(execFile);

export type GenerationResult = {
  ok: boolean;
  runId: string | null;
  stdout: string;
  stderr: string;
  error?: string;
};

function getPythonPath(cwd: string): string {
  // PYTHON_BIN env var overrides (useful in CI/Vercel where venv is at a different path).
  // Fallback: .venv/bin/python relative to the project root (matches local dev setup).
  return process.env.PYTHON_BIN ?? path.join(cwd, ".venv", "bin", "python");
}

function extractRunId(stdout: string): string | null {
  const match = stdout.match(/outputs\/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

async function initFeedbackLineage(runId: string): Promise<void> {
  await Promise.allSettled(
    channels.map(async (channel) => {
      const caption = await readTextFile(
        path.join(getChannelPath(runId, channel), "caption.txt")
      );
      const visualPrompt = await readTextFile(
        path.join(getChannelPath(runId, channel), "visual_prompt.txt")
      );
      if (caption) await ensureCaptionVersion(runId, channel, caption);
      if (visualPrompt) await ensureVisualPromptVersion(runId, channel, visualPrompt);
    })
  );
}

export async function runGeneration(idea: string): Promise<GenerationResult> {
  const cwd = process.cwd();
  const inputPath = path.join(cwd, "inputs", "raw-idea.txt");
  const pythonPath = getPythonPath(cwd);

  await mkdir(path.dirname(inputPath), { recursive: true });
  await writeFile(inputPath, idea, "utf8");

  try {
    const { stdout, stderr } = await execFileAsync(pythonPath, ["agent.py"], {
      cwd,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
      timeout: 1000 * 60 * 5,
    });

    const runId = extractRunId(stdout);

    if (runId) {
      await initFeedbackLineage(runId);
    }

    return { ok: true, runId, stdout, stderr };
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    console.error("[generation-runner] Python execution failed", {
      pythonPath,
      cwd,
      message: err.message,
      stderr: err.stderr?.slice(0, 500),
    });
    return {
      ok: false,
      runId: null,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      error: err.message,
    };
  }
}
