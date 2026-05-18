import type { TrainingInjection } from "@/lib/training-injections";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";

type ExtractedTags = {
  notes?: string;
  referenceUrl?: string;
  extractedTags?: string[];
  extractedPreferences?: string[];
  extractedConstraints?: string[];
  extractedVisualTags?: string[];
  extractedToneTags?: string[];
  extractedCompositionTags?: string[];
  extractedAudienceSignals?: string[];
  extractedStrategicSignals?: string[];
};

type TrainingInjectionRow = {
  id: string;
  label: string;
  type: TrainingInjection["type"];
  applies_to: TrainingInjection["appliesTo"];
  source_type: TrainingInjection["sourceType"] | null;
  raw_content: string | null;
  extracted_tags: ExtractedTags | null;
  is_active: boolean;
  created_at: string;
};

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toTrainingInjection(row: TrainingInjectionRow): TrainingInjection {
  const extracted = row.extracted_tags ?? {};

  return {
    id: row.id,
    type: row.type,
    label: row.label,
    notes: extracted.notes ?? "",
    sourceText: row.raw_content ?? "",
    sourceType: row.source_type ?? "text",
    referenceUrl: extracted.referenceUrl,
    extractedTags: arr(extracted.extractedTags),
    extractedPreferences: arr(extracted.extractedPreferences),
    extractedConstraints: arr(extracted.extractedConstraints),
    extractedVisualTags: arr(extracted.extractedVisualTags),
    extractedToneTags: arr(extracted.extractedToneTags),
    extractedCompositionTags: arr(extracted.extractedCompositionTags),
    extractedAudienceSignals: arr(extracted.extractedAudienceSignals),
    extractedStrategicSignals: arr(extracted.extractedStrategicSignals),
    appliesTo: row.applies_to,
    createdAt: row.created_at,
    active: row.is_active,
  };
}

function toExtractedTags(data: Partial<Omit<TrainingInjection, "id" | "createdAt">>): ExtractedTags {
  return {
    notes: data.notes,
    referenceUrl: data.referenceUrl,
    extractedTags: data.extractedTags,
    extractedPreferences: data.extractedPreferences,
    extractedConstraints: data.extractedConstraints,
    extractedVisualTags: data.extractedVisualTags,
    extractedToneTags: data.extractedToneTags,
    extractedCompositionTags: data.extractedCompositionTags,
    extractedAudienceSignals: data.extractedAudienceSignals,
    extractedStrategicSignals: data.extractedStrategicSignals,
  };
}

export async function listTrainingInjectionsDb(): Promise<TrainingInjection[]> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("training_injections")
    .select("id, label, type, applies_to, source_type, raw_content, extracted_tags, is_active, created_at")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .returns<TrainingInjectionRow[]>();

  if (error) {
    console.error("TRAINING INJECTIONS LIST ERROR", error);
    throw error;
  }

  return (data ?? []).map(toTrainingInjection);
}

export async function createTrainingInjectionDb(
  data: Omit<TrainingInjection, "id" | "createdAt">
): Promise<TrainingInjection> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("training_injections")
    .insert({
      organization_id: context.organization.id,
      created_by: context.user.id,
      label: data.label,
      type: data.type,
      applies_to: data.appliesTo,
      source_type: data.sourceType,
      raw_content: data.sourceText,
      extracted_tags: toExtractedTags(data),
      is_active: data.active,
    })
    .select("id, label, type, applies_to, source_type, raw_content, extracted_tags, is_active, created_at")
    .single<TrainingInjectionRow>();

  if (error) {
    console.error("TRAINING INJECTION CREATE ERROR", error);
    throw error;
  }

  return toTrainingInjection(row);
}

export async function updateTrainingInjectionDb(
  id: string,
  data: Partial<Omit<TrainingInjection, "id" | "createdAt">>
): Promise<TrainingInjection | null> {
  const context = await requireWorkspaceContext();
  const current = (await listTrainingInjectionsDb()).find((injection) => injection.id === id);

  if (!current) {
    return null;
  }

  const next = { ...current, ...data };
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("training_injections")
    .update({
      label: next.label,
      type: next.type,
      applies_to: next.appliesTo,
      source_type: next.sourceType,
      raw_content: next.sourceText,
      extracted_tags: toExtractedTags(next),
      is_active: next.active,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .select("id, label, type, applies_to, source_type, raw_content, extracted_tags, is_active, created_at")
    .maybeSingle<TrainingInjectionRow>();

  if (error) {
    console.error("TRAINING INJECTION UPDATE ERROR", error);
    throw error;
  }

  return row ? toTrainingInjection(row) : null;
}

export async function deleteTrainingInjectionDb(id: string): Promise<boolean> {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("training_injections")
    .delete({ count: "exact" })
    .eq("organization_id", context.organization.id)
    .eq("id", id);

  if (error) {
    console.error("TRAINING INJECTION DELETE ERROR", error);
    throw error;
  }

  return Boolean(count);
}
