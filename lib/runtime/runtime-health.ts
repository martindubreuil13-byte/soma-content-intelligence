import { verifyStorageBucketExists } from "@/lib/storage/storage-health";
import { getCurrentWorkspaceContext } from "@/lib/workspace/workspace-context";

export async function verifyWorkspaceAccess() {
  const context = await getCurrentWorkspaceContext();
  return context ? { ok: true as const, workspace: context.organization.name } : { ok: false as const, message: "Workspace not found." };
}

export async function verifyStorageHealth() {
  return verifyStorageBucketExists();
}

export async function verifyGenerationRuntime() {
  return {
    ok: Boolean(process.env.PYTHON_BIN || process.env.NODE_ENV !== "production") as boolean,
    message: process.env.PYTHON_BIN ? "Generation runtime configured." : "Using default local Python runtime.",
  };
}

export async function verifyOpenAIConnection() {
  return process.env.OPENAI_API_KEY
    ? { ok: true as const }
    : { ok: false as const, message: "AI generation service is not configured." };
}

export async function verifySchedulerHealth() {
  const workspace = await verifyWorkspaceAccess();
  return workspace.ok
    ? { ok: true as const, message: "Scheduler can access this workspace." }
    : { ok: false as const, message: "Scheduler needs workspace access." };
}
