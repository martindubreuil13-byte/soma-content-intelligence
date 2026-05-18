import type { ContentChannel } from "@/lib/content-types";
import type { ScheduleConfig } from "@/lib/autopilot-types";
import { defaultScheduleConfig } from "@/lib/autopilot-types";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type ScheduleConfigJson = {
  runTime?: string;
  ideaSource?: ScheduleConfig["ideaSource"];
  lastRunAt?: string;
  nextRunAt?: string;
};

type ScheduleConfigRow = {
  id: string;
  enabled: boolean;
  frequency: string | null;
  timezone: string | null;
  channels: ContentChannel[] | null;
  config: ScheduleConfigJson | null;
};

function toScheduleConfig(row: ScheduleConfigRow | null): ScheduleConfig {
  if (!row) {
    return { ...defaultScheduleConfig };
  }

  const config = row.config ?? {};

  return {
    ...defaultScheduleConfig,
    isEnabled: row.enabled,
    runTime: config.runTime ?? row.frequency ?? defaultScheduleConfig.runTime,
    timezone: row.timezone ?? defaultScheduleConfig.timezone,
    channels: Array.isArray(row.channels) ? row.channels : defaultScheduleConfig.channels,
    ideaSource: config.ideaSource ?? defaultScheduleConfig.ideaSource,
    lastRunAt: config.lastRunAt,
    nextRunAt: config.nextRunAt,
  };
}

function toRowPatch(config: ScheduleConfig) {
  return {
    enabled: config.isEnabled,
    frequency: config.runTime,
    timezone: config.timezone,
    channels: config.channels,
    config: {
      runTime: config.runTime,
      ideaSource: config.ideaSource,
      lastRunAt: config.lastRunAt,
      nextRunAt: config.nextRunAt,
    } satisfies ScheduleConfigJson,
  };
}

export async function readScheduleConfigDb(): Promise<ScheduleConfig> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("schedule_configs")
    .select("id, enabled, frequency, timezone, channels, config")
    .eq("organization_id", context.organization.id)
    .maybeSingle<ScheduleConfigRow>();

  if (error) {
    console.error("SCHEDULE CONFIG READ ERROR", error);
    throw error;
  }

  return toScheduleConfig(data);
}

export async function writeScheduleConfigDb(config: ScheduleConfig): Promise<ScheduleConfig> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("schedule_configs")
    .upsert(
      {
        organization_id: context.organization.id,
        created_by: context.user.id,
        ...toRowPatch(config),
      },
      { onConflict: "organization_id" }
    )
    .select("id, enabled, frequency, timezone, channels, config")
    .single<ScheduleConfigRow>();

  if (error) {
    console.error("SCHEDULE CONFIG WRITE ERROR", error);
    throw error;
  }

  return toScheduleConfig(data);
}

export async function updateScheduleConfigDb(
  updates: Partial<ScheduleConfig>
): Promise<ScheduleConfig> {
  const current = await readScheduleConfigDb();
  return writeScheduleConfigDb({ ...current, ...updates });
}
