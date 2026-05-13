import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ContentChannel } from "@/lib/content-types";

// ─── Core domain types ───────────────────────────────────────────────────────

export type BrandCore = {
  brandName: string;
  positioning: string;
  toneDescriptors: string[];
  communicationStyle: string;
  valueProposition: string;
  ctaPhilosophy: string;
  bannedLanguage: string[];
  messagingConstraints: string[];
  updatedAt: string;
};

export type ICP = {
  id: string;
  label: string;
  description: string;
  painPoints: string[];
  frustrations: string[];
  aspirations: string[];
  desiredOutcomes: string[];
  emotionalTriggers: string[];
  platforms: ContentChannel[];
  isActive: boolean;
  createdAt: string;
};

export type Angle = {
  id: string;
  label: string;
  description: string;
  tags: string[];
  platformAffinity: ContentChannel[];
  approvalRate: number;
  usageCount: number;
  performanceScore: number;
  isActive: boolean;
  createdAt: string;
};

export type HookStyle = {
  id: string;
  label: string;
  description: string;
  example: string;
  performanceScore: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
};

export type CTAStyle = {
  id: string;
  label: string;
  description: string;
  example: string;
  performanceScore: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
};

export type WinningPattern = {
  id: string;
  platform: ContentChannel;
  icpId: string;
  angleId: string;
  hookStyleId: string;
  ctaStyleId?: string;
  approvalCount: number;
  rejectionCount: number;
  firstPassApprovalRate: number;
  confidenceScore: number;
  lastUsedAt?: string;
  createdAt: string;
};

export type NegativeConstraint = {
  id: string;
  category: "language" | "visual" | "structure" | "tone";
  label: string;
  description: string;
  examples: string[];
  isActive: boolean;
  createdAt: string;
};

export type StrategyStack = {
  icpId?: string;
  icpLabel?: string;
  painPoint?: string;
  angleId?: string;
  angleLabel?: string;
  hookStyleId?: string;
  hookStyleLabel?: string;
  ctaStyleId?: string;
  ctaStyleLabel?: string;
  platform?: ContentChannel;
  explorationMode?: "proven" | "semi_experimental" | "exploratory";
  confidenceScore?: number;
  rationale?: string;
};

export type ApprovalTag =
  | "strong_hook"
  | "emotionally_strong"
  | "operational_clarity"
  | "good_visual"
  | "platform_fit"
  | "strong_cta"
  | "brand_aligned";

export type RejectionTag =
  | "generic"
  | "weak_hook"
  | "repetitive"
  | "poor_image"
  | "unclear_message"
  | "too_corporate"
  | "weak_cta"
  | "off_brand";

export type EditDelta = {
  id: string;
  runId: string;
  channel: ContentChannel;
  artifactType: "caption" | "visual_prompt";
  versionId: string;
  originalText: string;
  editedText: string;
  editedAt: string;
  notes?: string;
};

// ─── Storage paths ────────────────────────────────────────────────────────────

function intelligencePath(fileName: string) {
  return path.join(process.cwd(), "memory", "intelligence", fileName);
}

function memoryPath(fileName: string) {
  return path.join(process.cwd(), "memory", fileName);
}

async function ensureIntelligenceDir() {
  await mkdir(intelligencePath("."), { recursive: true });
}

// ─── Brand Core ───────────────────────────────────────────────────────────────

const defaultBrandCore: BrandCore = {
  brandName: "ALPA",
  positioning: "The AI-powered content engine for independent operators and boutique agencies.",
  toneDescriptors: ["direct", "operational", "human", "anti-corporate"],
  communicationStyle: "Clear, confident, and grounded. No motivational fluff.",
  valueProposition: "Wake up to ready-made content. Review it. Approve it. Publish in minutes.",
  ctaPhilosophy: "Low pressure. Curiosity-driven. No fake urgency.",
  bannedLanguage: ["game-changer", "synergy", "unlock your potential", "crush it", "leverage"],
  messagingConstraints: ["Never hype", "Never use passive voice for key claims", "Avoid generic startup language"],
  updatedAt: new Date().toISOString()
};

export async function readBrandCore(): Promise<BrandCore> {
  try {
    const raw = await readFile(intelligencePath("brand-core.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...defaultBrandCore };
    return { ...defaultBrandCore, ...(parsed as Partial<BrandCore>) };
  } catch {
    return { ...defaultBrandCore };
  }
}

export async function writeBrandCore(data: Partial<BrandCore>): Promise<BrandCore> {
  await ensureIntelligenceDir();
  const current = await readBrandCore();
  const next = { ...current, ...data, updatedAt: new Date().toISOString() };
  await writeFile(intelligencePath("brand-core.json"), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

// ─── Generic list CRUD helper ─────────────────────────────────────────────────

async function readList<T>(fileName: string): Promise<T[]> {
  try {
    const raw = await readFile(intelligencePath(fileName), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeList<T>(fileName: string, items: T[]): Promise<void> {
  await ensureIntelligenceDir();
  await writeFile(intelligencePath(fileName), `${JSON.stringify(items, null, 2)}\n`);
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── ICPs ─────────────────────────────────────────────────────────────────────

export async function readICPs(): Promise<ICP[]> {
  return readList<ICP>("icps.json");
}

export async function saveICP(data: Omit<ICP, "id" | "createdAt" | "approvalRate" | "usageCount"> & { id?: string }): Promise<ICP> {
  const all = await readICPs();
  const existing = data.id ? all.find((i) => i.id === data.id) : undefined;
  const item: ICP = {
    id: data.id ?? generateId("icp"),
    label: data.label,
    description: data.description,
    painPoints: data.painPoints ?? [],
    frustrations: data.frustrations ?? [],
    aspirations: data.aspirations ?? [],
    desiredOutcomes: data.desiredOutcomes ?? [],
    emotionalTriggers: data.emotionalTriggers ?? [],
    platforms: data.platforms ?? [],
    isActive: data.isActive ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
  const next = existing ? all.map((i) => (i.id === item.id ? item : i)) : [...all, item];
  await writeList("icps.json", next);
  return item;
}

export async function deleteICP(id: string): Promise<boolean> {
  const all = await readICPs();
  const next = all.filter((i) => i.id !== id);
  if (next.length === all.length) return false;
  await writeList("icps.json", next);
  return true;
}

// ─── Angles ───────────────────────────────────────────────────────────────────

export async function readAngles(): Promise<Angle[]> {
  return readList<Angle>("angles.json");
}

export async function saveAngle(data: Omit<Angle, "id" | "createdAt" | "approvalRate" | "usageCount" | "performanceScore"> & { id?: string }): Promise<Angle> {
  const all = await readAngles();
  const existing = data.id ? all.find((a) => a.id === data.id) : undefined;
  const item: Angle = {
    id: data.id ?? generateId("angle"),
    label: data.label,
    description: data.description,
    tags: data.tags ?? [],
    platformAffinity: data.platformAffinity ?? [],
    approvalRate: existing?.approvalRate ?? 0,
    usageCount: existing?.usageCount ?? 0,
    performanceScore: existing?.performanceScore ?? 0,
    isActive: data.isActive ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
  const next = existing ? all.map((a) => (a.id === item.id ? item : a)) : [...all, item];
  await writeList("angles.json", next);
  return item;
}

export async function deleteAngle(id: string): Promise<boolean> {
  const all = await readAngles();
  const next = all.filter((a) => a.id !== id);
  if (next.length === all.length) return false;
  await writeList("angles.json", next);
  return true;
}

// ─── Hook Styles ──────────────────────────────────────────────────────────────

export async function readHookStyles(): Promise<HookStyle[]> {
  return readList<HookStyle>("hook-styles.json");
}

export async function deleteHookStyle(id: string): Promise<boolean> {
  const all = await readHookStyles();
  const next = all.filter((h) => h.id !== id);
  if (next.length === all.length) return false;
  await writeList("hook-styles.json", next);
  return true;
}

export async function saveHookStyle(data: Omit<HookStyle, "id" | "createdAt" | "performanceScore" | "usageCount"> & { id?: string }): Promise<HookStyle> {
  const all = await readHookStyles();
  const existing = data.id ? all.find((h) => h.id === data.id) : undefined;
  const item: HookStyle = {
    id: data.id ?? generateId("hook"),
    label: data.label,
    description: data.description,
    example: data.example ?? "",
    performanceScore: existing?.performanceScore ?? 0,
    usageCount: existing?.usageCount ?? 0,
    isActive: data.isActive ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
  const next = existing ? all.map((h) => (h.id === item.id ? item : h)) : [...all, item];
  await writeList("hook-styles.json", next);
  return item;
}

// ─── CTA Styles ───────────────────────────────────────────────────────────────

export async function readCTAStyles(): Promise<CTAStyle[]> {
  return readList<CTAStyle>("cta-styles.json");
}

export async function deleteCTAStyle(id: string): Promise<boolean> {
  const all = await readCTAStyles();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  await writeList("cta-styles.json", next);
  return true;
}

export async function saveCTAStyle(data: Omit<CTAStyle, "id" | "createdAt" | "performanceScore" | "usageCount"> & { id?: string }): Promise<CTAStyle> {
  const all = await readCTAStyles();
  const existing = data.id ? all.find((c) => c.id === data.id) : undefined;
  const item: CTAStyle = {
    id: data.id ?? generateId("cta"),
    label: data.label,
    description: data.description,
    example: data.example ?? "",
    performanceScore: existing?.performanceScore ?? 0,
    usageCount: existing?.usageCount ?? 0,
    isActive: data.isActive ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
  const next = existing ? all.map((c) => (c.id === item.id ? item : c)) : [...all, item];
  await writeList("cta-styles.json", next);
  return item;
}

// ─── Winning Patterns ─────────────────────────────────────────────────────────

export async function readWinningPatterns(): Promise<WinningPattern[]> {
  return readList<WinningPattern>("winning-patterns.json");
}

export async function upsertWinningPattern(
  data: Pick<WinningPattern, "platform" | "icpId" | "angleId" | "hookStyleId" | "ctaStyleId">,
  delta: { approved?: boolean; rejected?: boolean; firstPass?: boolean }
): Promise<WinningPattern> {
  const all = await readWinningPatterns();
  const key = `${data.platform}:${data.icpId}:${data.angleId}:${data.hookStyleId}`;
  const existing = all.find(
    (p) => `${p.platform}:${p.icpId}:${p.angleId}:${p.hookStyleId}` === key
  );

  const approvalCount = (existing?.approvalCount ?? 0) + (delta.approved ? 1 : 0);
  const rejectionCount = (existing?.rejectionCount ?? 0) + (delta.rejected ? 1 : 0);
  const total = approvalCount + rejectionCount;
  const firstPassApprovalRate = delta.firstPass && delta.approved
    ? Math.min(1, ((existing?.firstPassApprovalRate ?? 0) * (total - 1) + 1) / total)
    : existing?.firstPassApprovalRate ?? 0;
  const confidenceScore = total > 0 ? Math.round((approvalCount / total) * 100) : 0;

  const item: WinningPattern = {
    id: existing?.id ?? generateId("pattern"),
    ...data,
    approvalCount,
    rejectionCount,
    firstPassApprovalRate,
    confidenceScore,
    lastUsedAt: new Date().toISOString(),
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };

  const next = existing ? all.map((p) => (p.id === item.id ? item : p)) : [...all, item];
  await writeList("winning-patterns.json", next);
  return item;
}

// ─── Negative Constraints ─────────────────────────────────────────────────────

export async function readNegativeConstraints(): Promise<NegativeConstraint[]> {
  return readList<NegativeConstraint>("negative-constraints.json");
}

export async function deleteNegativeConstraint(id: string): Promise<boolean> {
  const all = await readNegativeConstraints();
  const next = all.filter((n) => n.id !== id);
  if (next.length === all.length) return false;
  await writeList("negative-constraints.json", next);
  return true;
}

export async function saveNegativeConstraint(data: Omit<NegativeConstraint, "id" | "createdAt"> & { id?: string }): Promise<NegativeConstraint> {
  const all = await readNegativeConstraints();
  const existing = data.id ? all.find((n) => n.id === data.id) : undefined;
  const item: NegativeConstraint = {
    id: data.id ?? generateId("neg"),
    category: data.category,
    label: data.label,
    description: data.description,
    examples: data.examples ?? [],
    isActive: data.isActive ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
  const next = existing ? all.map((n) => (n.id === item.id ? item : n)) : [...all, item];
  await writeList("negative-constraints.json", next);
  return item;
}

// ─── Strategy Stacks (stored per run/channel in meta) ─────────────────────────

export async function readEditDeltas(): Promise<EditDelta[]> {
  return readList<EditDelta>("edit-deltas.json");
}

export async function appendEditDelta(delta: Omit<EditDelta, "id">): Promise<EditDelta> {
  const all = await readEditDeltas();
  const item: EditDelta = { ...delta, id: generateId("edit") };
  await writeList("edit-deltas.json", [...all, item]);
  return item;
}

// ─── Full intelligence snapshot (for generation context) ─────────────────────

export async function readFullIntelligence() {
  const [brandCore, icps, angles, hookStyles, ctaStyles, winningPatterns, negativeConstraints] =
    await Promise.all([
      readBrandCore(),
      readICPs(),
      readAngles(),
      readHookStyles(),
      readCTAStyles(),
      readWinningPatterns(),
      readNegativeConstraints()
    ]);

  return { brandCore, icps, angles, hookStyles, ctaStyles, winningPatterns, negativeConstraints };
}

// ─── Seed defaults if empty ───────────────────────────────────────────────────

export async function seedDefaultsIfEmpty() {
  const [icps, angles, hookStyles, ctaStyles, negConstraints] = await Promise.all([
    readICPs(),
    readAngles(),
    readHookStyles(),
    readCTAStyles(),
    readNegativeConstraints()
  ]);

  if (!icps.length) {
    await Promise.all([
      saveICP({ label: "Freelancers & Independents", description: "Solo operators running their own practice.", painPoints: ["too much admin", "inconsistent pipeline", "unpredictable income"], frustrations: ["time lost on non-billable work", "chasing clients manually"], aspirations: ["predictable recurring revenue", "work they love"], desiredOutcomes: ["inbound leads", "premium positioning"], emotionalTriggers: ["freedom", "autonomy", "burnout"], platforms: ["linkedin", "instagram"], isActive: true }),
      saveICP({ label: "Boutique Agencies", description: "Small agencies (1–15 people) doing client work.", painPoints: ["manual prospecting", "inconsistent content", "team bandwidth"], frustrations: ["generic positioning", "competing with larger agencies on volume"], aspirations: ["premium market position", "consistent new clients"], desiredOutcomes: ["qualified inbound leads", "differentiated brand"], emotionalTriggers: ["reputation", "growth", "team exhaustion"], platforms: ["linkedin", "facebook"], isActive: true }),
      saveICP({ label: "Founders & Operators", description: "Founders building something independently.", painPoints: ["visibility", "content time drain", "no marketing team"], frustrations: ["generic AI content", "no consistent voice"], aspirations: ["thought leadership", "brand recognition"], desiredOutcomes: ["inbound", "network growth", "trust"], emotionalTriggers: ["impact", "recognition", "exhaustion"], platforms: ["linkedin", "instagram"], isActive: true })
    ]);
  }

  if (!angles.length) {
    await Promise.all([
      saveAngle({ label: "Operational Frustration", description: "The pain of manual, repetitive work that should be automated.", tags: ["pain", "operations", "efficiency"], platformAffinity: ["linkedin", "facebook"], isActive: true }),
      saveAngle({ label: "Anti-Generic Marketing", description: "Frustration with AI slop, generic content, and commoditized agencies.", tags: ["differentiation", "quality", "positioning"], platformAffinity: ["linkedin", "instagram"], isActive: true }),
      saveAngle({ label: "Automation Liberation", description: "The freedom that comes from automating the right things.", tags: ["automation", "freedom", "efficiency"], platformAffinity: ["linkedin", "facebook", "instagram"], isActive: true }),
      saveAngle({ label: "Founder Exhaustion", description: "The emotional reality of building alone.", tags: ["emotion", "burnout", "solo"], platformAffinity: ["linkedin", "instagram"], isActive: true }),
      saveAngle({ label: "Speed Advantage", description: "Moving faster than competitors through smarter systems.", tags: ["competitive", "speed", "leverage"], platformAffinity: ["linkedin", "facebook"], isActive: true })
    ]);
  }

  if (!hookStyles.length) {
    await Promise.all([
      saveHookStyle({ label: "Contrarian", description: "Challenge the conventional wisdom in the space.", example: "Everyone says you need more content. You need better systems.", isActive: true }),
      saveHookStyle({ label: "Operational Pain", description: "Open with a specific frustrating task or bottleneck.", example: "Writing 4 LinkedIn posts a week for 3 clients is not a content strategy.", isActive: true }),
      saveHookStyle({ label: "Hard Truth", description: "State an uncomfortable reality directly.", example: "Your content is forgettable. Not because you lack ideas. Because you lack a process.", isActive: true }),
      saveHookStyle({ label: "Curiosity", description: "Create intrigue with an incomplete statement.", example: "There are 3 reasons most agency content fails. None of them are creativity.", isActive: true }),
      saveHookStyle({ label: "Emotional Insight", description: "Acknowledge a feeling the audience experiences but rarely names.", example: "You didn't start your agency to spend Sunday writing captions.", isActive: true })
    ]);
  }

  if (!ctaStyles.length) {
    await Promise.all([
      saveCTAStyle({ label: "Curiosity CTA", description: "Invite people to explore without pressure.", example: "Worth seeing how it works → alpa.agency", isActive: true }),
      saveCTAStyle({ label: "Direct CTA", description: "Clear, confident, no-fluff action.", example: "Try ALPA free → alpa.agency", isActive: true }),
      saveCTAStyle({ label: "Conversational CTA", description: "Sound like a human, not an ad.", example: "If you're dealing with this, ALPA was built for you → alpa.agency", isActive: true }),
      saveCTAStyle({ label: "Low-Pressure CTA", description: "Soft invitation, no urgency.", example: "See what it looks like when AI actually knows your brand → alpa.agency", isActive: true })
    ]);
  }

  if (!negConstraints.length) {
    await Promise.all([
      saveNegativeConstraint({ category: "language", label: "Generic AI language", description: "Avoid words that signal generic AI output.", examples: ["leverage", "unlock", "game-changer", "revolutionize", "transform your"], isActive: true }),
      saveNegativeConstraint({ category: "tone", label: "Fake guru energy", description: "Never sound like a motivational speaker or hustle-culture influencer.", examples: ["crush it", "10x your results", "mindset shift", "level up"], isActive: true }),
      saveNegativeConstraint({ category: "structure", label: "Weak hooks", description: "Opening lines that don't immediately create tension or curiosity.", examples: ["Are you looking for...", "In today's digital world...", "I'm excited to share..."], isActive: true }),
      saveNegativeConstraint({ category: "language", label: "Corporate jargon", description: "Formal enterprise language that distances rather than connects.", examples: ["synergy", "bandwidth", "paradigm shift", "stakeholders", "circle back"], isActive: true })
    ]);
  }
}
