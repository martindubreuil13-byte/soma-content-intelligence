import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ScheduleConfig } from "@/lib/autopilot-types";
import { defaultScheduleConfig } from "@/lib/autopilot-types";

function memoryPath(fileName: string) {
  return path.join(process.cwd(), "memory", fileName);
}

export async function readScheduleConfig(): Promise<ScheduleConfig> {
  try {
    const raw = await readFile(memoryPath("schedule-config.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...defaultScheduleConfig };
    }
    return { ...defaultScheduleConfig, ...(parsed as Partial<ScheduleConfig>) };
  } catch {
    return { ...defaultScheduleConfig };
  }
}

export async function writeScheduleConfig(config: ScheduleConfig): Promise<void> {
  await mkdir(memoryPath("."), { recursive: true });
  await writeFile(memoryPath("schedule-config.json"), `${JSON.stringify(config, null, 2)}\n`);
}

export async function updateScheduleConfig(updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
  const current = await readScheduleConfig();
  const next = { ...current, ...updates };
  await writeScheduleConfig(next);
  return next;
}
