import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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
  // Core extraction (all source types)
  extractedTags: string[];
  extractedPreferences: string[];
  extractedConstraints: string[];
  // Specialized extraction (image/PDF)
  extractedVisualTags: string[];
  extractedToneTags: string[];
  extractedCompositionTags: string[];
  extractedAudienceSignals: string[];
  extractedStrategicSignals: string[];
  appliesTo: InjectionAppliesTo;
  createdAt: string;
  active: boolean;
};

function injectionPath(): string {
  return path.join(process.cwd(), "memory", "training-injections.json");
}

function normalize(raw: unknown): TrainingInjection {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arr = (key: string): string[] => {
    const val = r[key];
    return Array.isArray(val) ? (val as string[]).filter((s) => typeof s === "string") : [];
  };
  return {
    id: typeof r.id === "string" ? r.id : "",
    type: (r.type as InjectionType) ?? "content_idea",
    label: typeof r.label === "string" ? r.label : "",
    notes: typeof r.notes === "string" ? r.notes : "",
    sourceText: typeof r.sourceText === "string" ? r.sourceText : "",
    sourceType: (r.sourceType as InjectionSourceType) ?? "text",
    referenceUrl: typeof r.referenceUrl === "string" ? r.referenceUrl : (typeof r.imageUrl === "string" ? r.imageUrl : undefined),
    extractedTags: arr("extractedTags"),
    extractedPreferences: arr("extractedPreferences"),
    extractedConstraints: arr("extractedConstraints"),
    extractedVisualTags: arr("extractedVisualTags"),
    extractedToneTags: arr("extractedToneTags"),
    extractedCompositionTags: arr("extractedCompositionTags"),
    extractedAudienceSignals: arr("extractedAudienceSignals"),
    extractedStrategicSignals: arr("extractedStrategicSignals"),
    appliesTo: (r.appliesTo as InjectionAppliesTo) ?? "all",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    active: typeof r.active === "boolean" ? r.active : true,
  };
}

export async function readTrainingInjections(): Promise<TrainingInjection[]> {
  try {
    const data = await readFile(injectionPath(), "utf8");
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? (parsed as unknown[]).map(normalize) : [];
  } catch {
    return [];
  }
}

async function writeTrainingInjections(injections: TrainingInjection[]): Promise<void> {
  await mkdir(path.dirname(injectionPath()), { recursive: true });
  await writeFile(injectionPath(), `${JSON.stringify(injections, null, 2)}\n`);
}

export async function createTrainingInjection(
  data: Omit<TrainingInjection, "id" | "createdAt">
): Promise<TrainingInjection> {
  const injections = await readTrainingInjections();
  const injection: TrainingInjection = {
    ...data,
    id: `inj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    createdAt: new Date().toISOString(),
  };
  injections.unshift(injection);
  await writeTrainingInjections(injections);
  return injection;
}

export async function updateTrainingInjection(
  id: string,
  data: Partial<Omit<TrainingInjection, "id" | "createdAt">>
): Promise<TrainingInjection | null> {
  const injections = await readTrainingInjections();
  const idx = injections.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  injections[idx] = { ...injections[idx], ...data };
  await writeTrainingInjections(injections);
  return injections[idx];
}

export async function deleteTrainingInjection(id: string): Promise<boolean> {
  const injections = await readTrainingInjections();
  const filtered = injections.filter((i) => i.id !== id);
  if (filtered.length === injections.length) return false;
  await writeTrainingInjections(filtered);
  return true;
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
