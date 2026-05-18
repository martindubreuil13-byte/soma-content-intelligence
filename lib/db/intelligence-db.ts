import type {
  Angle,
  BrandCore,
  CTAStyle,
  HookStyle,
  ICP,
  NegativeConstraint,
} from "@/lib/brand-intelligence";
import type { LearningEvent } from "@/lib/agent-training";
import type { PreferenceMemory } from "@/lib/preference-memory";
import type { ContentChannel } from "@/lib/content-types";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type JsonObject = Record<string, unknown>;

export type PreferenceMemoryRow = {
  id: string;
  organizationId: string;
  category: string;
  key: string;
  value: unknown;
  weight: number;
  metadata: JsonObject;
  updatedAt: string;
};

const brandCoreSelect = "id, mission, positioning, voice, audience, metadata, created_at, updated_at";

const arr = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function channels(value: unknown): ContentChannel[] {
  return arr(value).filter((item): item is ContentChannel =>
    item === "linkedin" || item === "facebook" || item === "instagram" || item === "tiktok"
  );
}

function now() {
  return new Date().toISOString();
}

function metadata(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function toBrandCore(row: {
  positioning: string | null;
  voice: string | null;
  audience: string | null;
  metadata: JsonObject | null;
  updated_at: string;
} | null, fallback: BrandCore): BrandCore {
  if (!row) return { ...fallback };
  const meta = metadata(row.metadata);
  return {
    ...fallback,
    brandName: typeof meta.brandName === "string" ? meta.brandName : fallback.brandName,
    positioning: row.positioning ?? fallback.positioning,
    toneDescriptors: arr(meta.toneDescriptors),
    communicationStyle: row.voice ?? fallback.communicationStyle,
    valueProposition: row.audience ?? fallback.valueProposition,
    ctaPhilosophy: typeof meta.ctaPhilosophy === "string" ? meta.ctaPhilosophy : fallback.ctaPhilosophy,
    bannedLanguage: arr(meta.bannedLanguage),
    messagingConstraints: arr(meta.messagingConstraints),
    updatedAt: row.updated_at,
  };
}

export async function getBrandCore(fallback: BrandCore): Promise<BrandCore> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("brand_cores")
    .select(brandCoreSelect)
    .eq("organization_id", context.organization.id)
    .maybeSingle<{
      positioning: string | null;
      voice: string | null;
      audience: string | null;
      metadata: JsonObject | null;
      updated_at: string;
    }>();
  if (error) {
    console.error("BRAND CORE GET ERROR", error);
    throw error;
  }
  return toBrandCore(data, fallback);
}

export async function saveBrandCore(data: BrandCore): Promise<BrandCore> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("brand_cores")
    .upsert(
      {
        organization_id: context.organization.id,
        positioning: data.positioning,
        voice: data.communicationStyle,
        audience: data.valueProposition,
        metadata: {
          brandName: data.brandName,
          toneDescriptors: data.toneDescriptors,
          ctaPhilosophy: data.ctaPhilosophy,
          bannedLanguage: data.bannedLanguage,
          messagingConstraints: data.messagingConstraints,
          updatedAt: data.updatedAt,
        },
      },
      { onConflict: "organization_id" }
    )
    .select(brandCoreSelect)
    .single<{
      positioning: string | null;
      voice: string | null;
      audience: string | null;
      metadata: JsonObject | null;
      updated_at: string;
    }>();
  if (error) {
    console.error("BRAND CORE SAVE ERROR", error);
    throw error;
  }
  return toBrandCore(row, data);
}

function toICP(row: {
  id: string;
  label: string;
  description: string | null;
  pains: unknown;
  desires: unknown;
  triggers: unknown;
  channels: unknown;
  metadata: JsonObject | null;
  created_at: string;
}): ICP {
  const meta = metadata(row.metadata);
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    painPoints: arr(row.pains),
    frustrations: arr(meta.frustrations),
    aspirations: arr(row.desires),
    desiredOutcomes: arr(meta.desiredOutcomes),
    emotionalTriggers: arr(row.triggers),
    platforms: channels(row.channels),
    isActive: typeof meta.isActive === "boolean" ? meta.isActive : true,
    createdAt: row.created_at,
  };
}

export async function listICPs(): Promise<ICP[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("brand_icps")
    .select("id, label, description, pains, desires, triggers, channels, metadata, created_at")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toICP);
}

export async function saveICP(data: Omit<ICP, "createdAt"> & { createdAt?: string }): Promise<ICP> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const payload = {
    organization_id: context.organization.id,
    label: data.label,
    description: data.description,
    pains: data.painPoints ?? [],
    desires: data.aspirations ?? [],
    triggers: data.emotionalTriggers ?? [],
    channels: data.platforms ?? [],
    metadata: {
      frustrations: data.frustrations ?? [],
      desiredOutcomes: data.desiredOutcomes ?? [],
      isActive: data.isActive ?? true,
    },
  };
  const query = data.id
    ? supabase.from("brand_icps").update(payload).eq("organization_id", context.organization.id).eq("id", data.id)
    : supabase.from("brand_icps").insert(payload);
  const { data: row, error } = await query
    .select("id, label, description, pains, desires, triggers, channels, metadata, created_at")
    .single();
  if (error) throw error;
  return toICP(row);
}

export async function deleteICP(id: string): Promise<boolean> {
  return deleteById("brand_icps", id);
}

function toAngle(row: {
  id: string;
  label: string;
  description: string | null;
  emotional_weight: number;
  channels: unknown;
  metadata: JsonObject | null;
  created_at: string;
}): Angle {
  const meta = metadata(row.metadata);
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    tags: arr(meta.tags),
    platformAffinity: channels(row.channels),
    approvalRate: Number(meta.approvalRate ?? 0),
    usageCount: Number(meta.usageCount ?? 0),
    performanceScore: Number(meta.performanceScore ?? row.emotional_weight ?? 0),
    isActive: typeof meta.isActive === "boolean" ? meta.isActive : true,
    createdAt: row.created_at,
  };
}

export async function listAngles(): Promise<Angle[]> {
  const rows = await listRows("brand_angles", "id, label, description, emotional_weight, channels, metadata, created_at");
  return rows.map(toAngle);
}

export async function saveAngle(data: Omit<Angle, "createdAt"> & { createdAt?: string }): Promise<Angle> {
  const row = await saveRow("brand_angles", data.id, {
    label: data.label,
    description: data.description,
    emotional_weight: data.performanceScore ?? 0,
    channels: data.platformAffinity ?? [],
    metadata: {
      tags: data.tags ?? [],
      approvalRate: data.approvalRate ?? 0,
      usageCount: data.usageCount ?? 0,
      performanceScore: data.performanceScore ?? 0,
      isActive: data.isActive ?? true,
    },
  }, "id, label, description, emotional_weight, channels, metadata, created_at");
  return toAngle(row);
}

export async function deleteAngle(id: string): Promise<boolean> {
  return deleteById("brand_angles", id);
}

function toHookStyle(row: {
  id: string;
  label: string;
  description: string | null;
  examples: unknown;
  metadata: JsonObject | null;
  created_at: string;
}): HookStyle {
  const meta = metadata(row.metadata);
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    example: arr(row.examples)[0] ?? "",
    performanceScore: Number(meta.performanceScore ?? 0),
    usageCount: Number(meta.usageCount ?? 0),
    isActive: typeof meta.isActive === "boolean" ? meta.isActive : true,
    createdAt: row.created_at,
  };
}

export async function listHookStyles(): Promise<HookStyle[]> {
  const rows = await listRows("brand_hook_styles", "id, label, description, examples, metadata, created_at");
  return rows.map(toHookStyle);
}

export async function saveHookStyle(data: Omit<HookStyle, "createdAt"> & { createdAt?: string }): Promise<HookStyle> {
  const row = await saveRow("brand_hook_styles", data.id, {
    label: data.label,
    description: data.description,
    examples: data.example ? [data.example] : [],
    metadata: {
      performanceScore: data.performanceScore ?? 0,
      usageCount: data.usageCount ?? 0,
      isActive: data.isActive ?? true,
    },
  }, "id, label, description, examples, metadata, created_at");
  return toHookStyle(row);
}

export async function deleteHookStyle(id: string): Promise<boolean> {
  return deleteById("brand_hook_styles", id);
}

function toCTAStyle(row: {
  id: string;
  label: string;
  description: string | null;
  examples: unknown;
  metadata: JsonObject | null;
  created_at: string;
}): CTAStyle {
  const meta = metadata(row.metadata);
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    example: arr(row.examples)[0] ?? "",
    performanceScore: Number(meta.performanceScore ?? 0),
    usageCount: Number(meta.usageCount ?? 0),
    isActive: typeof meta.isActive === "boolean" ? meta.isActive : true,
    createdAt: row.created_at,
  };
}

export async function listCTAStyles(): Promise<CTAStyle[]> {
  const rows = await listRows("brand_cta_styles", "id, label, description, examples, metadata, created_at");
  return rows.map(toCTAStyle);
}

export async function saveCTAStyle(data: Omit<CTAStyle, "createdAt"> & { createdAt?: string }): Promise<CTAStyle> {
  const row = await saveRow("brand_cta_styles", data.id, {
    label: data.label,
    description: data.description,
    examples: data.example ? [data.example] : [],
    metadata: {
      performanceScore: data.performanceScore ?? 0,
      usageCount: data.usageCount ?? 0,
      isActive: data.isActive ?? true,
    },
  }, "id, label, description, examples, metadata, created_at");
  return toCTAStyle(row);
}

export async function deleteCTAStyle(id: string): Promise<boolean> {
  return deleteById("brand_cta_styles", id);
}

function toConstraint(row: {
  id: string;
  category: NegativeConstraint["category"] | null;
  label: string;
  description: string | null;
  metadata: JsonObject | null;
  created_at: string;
}): NegativeConstraint {
  const meta = metadata(row.metadata);
  return {
    id: row.id,
    category: row.category ?? "language",
    label: row.label,
    description: row.description ?? "",
    examples: arr(meta.examples),
    isActive: typeof meta.isActive === "boolean" ? meta.isActive : true,
    createdAt: row.created_at,
  };
}

export async function listConstraints(): Promise<NegativeConstraint[]> {
  const rows = await listRows("brand_constraints", "id, category, label, description, metadata, created_at");
  return rows.map(toConstraint);
}

export async function saveConstraint(data: Omit<NegativeConstraint, "createdAt"> & { createdAt?: string }): Promise<NegativeConstraint> {
  const row = await saveRow("brand_constraints", data.id, {
    category: data.category,
    label: data.label,
    description: data.description,
    metadata: {
      examples: data.examples ?? [],
      isActive: data.isActive ?? true,
    },
  }, "id, category, label, description, metadata, created_at");
  return toConstraint(row);
}

export async function deleteConstraint(id: string): Promise<boolean> {
  return deleteById("brand_constraints", id);
}

export async function createLearningEvent(event: LearningEvent): Promise<LearningEvent> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("learning_events").upsert(
    {
      id: event.id,
      organization_id: context.organization.id,
      event_type: event.action,
      channel: event.channel,
      target_type: event.artifactType,
      status: event.action === "approved" || event.action === "rejected" ? event.action : null,
      tags: [],
      notes: event.notes ?? null,
      metadata: event,
      created_at: event.timestamp,
    },
    { onConflict: "id" }
  );
  if (error) {
    console.error("LEARNING EVENT CREATE ERROR", error);
    throw error;
  }
  return event;
}

export async function listLearningEvents(): Promise<LearningEvent[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("learning_events")
    .select("metadata")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("LEARNING EVENT LIST ERROR", error);
    throw error;
  }
  return (data ?? []).map((row) => row.metadata as LearningEvent).filter(Boolean);
}

export async function savePreferenceMemory(memory: PreferenceMemory): Promise<PreferenceMemory> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const rows = Object.entries(memory).map(([key, value]) => ({
    organization_id: context.organization.id,
    category: "preference_memory",
    key,
    value,
    weight: Array.isArray(value) ? value.length : 0,
    metadata: { last_updated: memory.last_updated ?? now() },
  }));
  const { error } = await supabase.from("preference_memories").upsert(rows, {
    onConflict: "organization_id,category,key",
  });
  if (error) {
    console.error("PREFERENCE MEMORY SAVE ERROR", error);
    throw error;
  }
  return memory;
}

export async function listPreferenceMemories(): Promise<PreferenceMemoryRow[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("preference_memories")
    .select("id, organization_id, category, key, value, weight, metadata, updated_at")
    .eq("organization_id", context.organization.id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("PREFERENCE MEMORY LIST ERROR", error);
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    category: row.category,
    key: row.key,
    value: row.value,
    weight: Number(row.weight ?? 0),
    metadata: metadata(row.metadata),
    updatedAt: row.updated_at,
  }));
}

async function listRows(table: string, select: string): Promise<any[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error(`INTELLIGENCE LIST ERROR ${table}`, error);
    throw error;
  }
  return (data ?? []) as any[];
}

async function saveRow(table: string, id: string | undefined, payload: JsonObject, select: string): Promise<any> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const scopedPayload = { ...payload, organization_id: context.organization.id };
  const query = id
    ? supabase.from(table).update(scopedPayload).eq("organization_id", context.organization.id).eq("id", id)
    : supabase.from(table).insert(scopedPayload);
  const { data, error } = await query.select(select).single();
  if (error) {
    console.error(`INTELLIGENCE SAVE ERROR ${table}`, error);
    throw error;
  }
  return data as any;
}

async function deleteById(table: string, id: string): Promise<boolean> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("organization_id", context.organization.id)
    .eq("id", id);
  if (error) {
    console.error(`INTELLIGENCE DELETE ERROR ${table}`, error);
    throw error;
  }
  return Boolean(count);
}
