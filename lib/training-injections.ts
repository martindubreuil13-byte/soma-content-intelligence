import {
  createTrainingInjectionDb,
  deleteTrainingInjectionDb,
  listTrainingInjectionsDb,
  updateTrainingInjectionDb,
} from "@/lib/db/training-injections-db";

export type InjectionType = "visual_reference" | "caption_reference" | "content_idea" | "negative_training";
export type InjectionAppliesTo = "caption" | "image" | "poster" | "all";
export type InjectionSourceType = "text" | "image" | "pdf" | "url";

export type TrainingInjection = {
  id: string;
  type: InjectionType;
  label: string;
  notes: string;
  sourceText: string;
  sourceType: InjectionSourceType;
  referenceUrl?: string;
  extractedTags: string[];
  extractedPreferences: string[];
  extractedConstraints: string[];
  extractedVisualTags: string[];
  extractedToneTags: string[];
  extractedCompositionTags: string[];
  extractedAudienceSignals: string[];
  extractedStrategicSignals: string[];
  appliesTo: InjectionAppliesTo;
  createdAt: string;
  active: boolean;
};

export async function readTrainingInjections(): Promise<TrainingInjection[]> {
  return listTrainingInjectionsDb();
}

export async function createTrainingInjection(
  data: Omit<TrainingInjection, "id" | "createdAt">
): Promise<TrainingInjection> {
  return createTrainingInjectionDb(data);
}

export async function updateTrainingInjection(
  id: string,
  data: Partial<Omit<TrainingInjection, "id" | "createdAt">>
): Promise<TrainingInjection | null> {
  return updateTrainingInjectionDb(id, data);
}

export async function deleteTrainingInjection(id: string): Promise<boolean> {
  return deleteTrainingInjectionDb(id);
}

export async function getActiveInjections(
  appliesTo?: InjectionAppliesTo
): Promise<TrainingInjection[]> {
  const injections = await readTrainingInjections();
  return injections.filter(
    (i) =>
      i.active &&
      (!appliesTo || i.appliesTo === "all" || i.appliesTo === appliesTo)
  );
}
