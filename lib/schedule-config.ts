import type { ScheduleConfig } from "@/lib/autopilot-types";
import {
  readScheduleConfigDb,
  updateScheduleConfigDb,
  writeScheduleConfigDb,
} from "@/lib/db/schedule-config-db";

export async function readScheduleConfig(): Promise<ScheduleConfig> {
  return readScheduleConfigDb();
}

export async function writeScheduleConfig(config: ScheduleConfig): Promise<void> {
  await writeScheduleConfigDb(config);
}

export async function updateScheduleConfig(
  updates: Partial<ScheduleConfig>
): Promise<ScheduleConfig> {
  return updateScheduleConfigDb(updates);
}
