import type { ContentChannel } from "@/lib/content-types";
import {
  deleteAngle as deleteAngleDb,
  deleteCTAStyle as deleteCTAStyleDb,
  deleteConstraint,
  deleteHookStyle as deleteHookStyleDb,
  deleteICP as deleteICPDb,
  getBrandCore,
  listAngles,
  listCTAStyles,
  listConstraints,
  listHookStyles,
  listICPs,
  saveAngle as saveAngleDb,
  saveBrandCore,
  saveCTAStyle as saveCTAStyleDb,
  saveConstraint,
  saveHookStyle as saveHookStyleDb,
  saveICP as saveICPDb,
} from "@/lib/db/intelligence-db";

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

const defaultBrandCore: BrandCore = {
  brandName: "ALPA",
  positioning: "The AI-powered content engine for independent operators and boutique agencies.",
  toneDescriptors: ["direct", "operational", "human", "anti-corporate"],
  communicationStyle: "Clear, confident, and grounded. No motivational fluff.",
  valueProposition: "Wake up to ready-made content. Review it. Approve it. Publish in minutes.",
  ctaPhilosophy: "Low pressure. Curiosity-driven. No fake urgency.",
  bannedLanguage: ["game-changer", "synergy", "unlock your potential", "crush it", "leverage"],
  messagingConstraints: ["Never hype", "Never use passive voice for key claims", "Avoid generic startup language"],
  updatedAt: new Date().toISOString(),
};

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function readBrandCore(): Promise<BrandCore> {
  return getBrandCore(defaultBrandCore);
}

export async function writeBrandCore(data: Partial<BrandCore>): Promise<BrandCore> {
  const current = await readBrandCore();
  return saveBrandCore({ ...current, ...data, updatedAt: new Date().toISOString() });
}

export async function readICPs(): Promise<ICP[]> {
  return listICPs();
}

export async function saveICP(data: Omit<ICP, "id" | "createdAt" | "approvalRate" | "usageCount"> & { id?: string }): Promise<ICP> {
  return saveICPDb({
    id: data.id ?? "",
    label: data.label,
    description: data.description,
    painPoints: data.painPoints ?? [],
    frustrations: data.frustrations ?? [],
    aspirations: data.aspirations ?? [],
    desiredOutcomes: data.desiredOutcomes ?? [],
    emotionalTriggers: data.emotionalTriggers ?? [],
    platforms: data.platforms ?? [],
    isActive: data.isActive ?? true,
  });
}

export async function deleteICP(id: string): Promise<boolean> {
  return deleteICPDb(id);
}

export async function readAngles(): Promise<Angle[]> {
  return listAngles();
}

export async function saveAngle(data: Omit<Angle, "id" | "createdAt" | "approvalRate" | "usageCount" | "performanceScore"> & { id?: string }): Promise<Angle> {
  return saveAngleDb({
    id: data.id ?? "",
    label: data.label,
    description: data.description,
    tags: data.tags ?? [],
    platformAffinity: data.platformAffinity ?? [],
    approvalRate: 0,
    usageCount: 0,
    performanceScore: 0,
    isActive: data.isActive ?? true,
  });
}

export async function deleteAngle(id: string): Promise<boolean> {
  return deleteAngleDb(id);
}

export async function readHookStyles(): Promise<HookStyle[]> {
  return listHookStyles();
}

export async function saveHookStyle(data: Omit<HookStyle, "id" | "createdAt" | "performanceScore" | "usageCount"> & { id?: string }): Promise<HookStyle> {
  return saveHookStyleDb({
    id: data.id ?? "",
    label: data.label,
    description: data.description,
    example: data.example ?? "",
    performanceScore: 0,
    usageCount: 0,
    isActive: data.isActive ?? true,
  });
}

export async function deleteHookStyle(id: string): Promise<boolean> {
  return deleteHookStyleDb(id);
}

export async function readCTAStyles(): Promise<CTAStyle[]> {
  return listCTAStyles();
}

export async function saveCTAStyle(data: Omit<CTAStyle, "id" | "createdAt" | "performanceScore" | "usageCount"> & { id?: string }): Promise<CTAStyle> {
  return saveCTAStyleDb({
    id: data.id ?? "",
    label: data.label,
    description: data.description,
    example: data.example ?? "",
    performanceScore: 0,
    usageCount: 0,
    isActive: data.isActive ?? true,
  });
}

export async function deleteCTAStyle(id: string): Promise<boolean> {
  return deleteCTAStyleDb(id);
}

export async function readNegativeConstraints(): Promise<NegativeConstraint[]> {
  return listConstraints();
}

export async function saveNegativeConstraint(data: Omit<NegativeConstraint, "id" | "createdAt"> & { id?: string }): Promise<NegativeConstraint> {
  return saveConstraint({
    id: data.id ?? "",
    category: data.category,
    label: data.label,
    description: data.description,
    examples: data.examples ?? [],
    isActive: data.isActive ?? true,
  });
}

export async function deleteNegativeConstraint(id: string): Promise<boolean> {
  return deleteConstraint(id);
}

export async function readWinningPatterns(): Promise<WinningPattern[]> {
  return [];
}

export async function upsertWinningPattern(
  data: Pick<WinningPattern, "platform" | "icpId" | "angleId" | "hookStyleId" | "ctaStyleId">,
  delta: { approved?: boolean; rejected?: boolean; firstPass?: boolean }
): Promise<WinningPattern> {
  const approvalCount = delta.approved ? 1 : 0;
  const rejectionCount = delta.rejected ? 1 : 0;
  const total = approvalCount + rejectionCount;
  return {
    id: generateId("pattern"),
    ...data,
    approvalCount,
    rejectionCount,
    firstPassApprovalRate: delta.firstPass && delta.approved ? 1 : 0,
    confidenceScore: total > 0 ? Math.round((approvalCount / total) * 100) : 0,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function readEditDeltas(): Promise<EditDelta[]> {
  return [];
}

export async function appendEditDelta(delta: Omit<EditDelta, "id">): Promise<EditDelta> {
  return { ...delta, id: generateId("edit") };
}

export async function readFullIntelligence() {
  const [brandCore, icps, angles, hookStyles, ctaStyles, winningPatterns, negativeConstraints] =
    await Promise.all([
      readBrandCore(),
      readICPs(),
      readAngles(),
      readHookStyles(),
      readCTAStyles(),
      readWinningPatterns(),
      readNegativeConstraints(),
    ]);

  return { brandCore, icps, angles, hookStyles, ctaStyles, winningPatterns, negativeConstraints };
}

export async function seedDefaultsIfEmpty() {
  const [icps, angles, hookStyles, ctaStyles, negConstraints] = await Promise.all([
    readICPs(),
    readAngles(),
    readHookStyles(),
    readCTAStyles(),
    readNegativeConstraints(),
  ]);

  if (!icps.length) {
    await Promise.all([
      saveICP({ label: "Freelancers & Independents", description: "Solo operators running their own practice.", painPoints: ["too much admin", "inconsistent pipeline", "unpredictable income"], frustrations: ["time lost on non-billable work", "chasing clients manually"], aspirations: ["predictable recurring revenue", "work they love"], desiredOutcomes: ["inbound leads", "premium positioning"], emotionalTriggers: ["freedom", "autonomy", "burnout"], platforms: ["linkedin", "instagram"], isActive: true }),
      saveICP({ label: "Boutique Agencies", description: "Small agencies (1-15 people) doing client work.", painPoints: ["manual prospecting", "inconsistent content", "team bandwidth"], frustrations: ["generic positioning", "competing with larger agencies on volume"], aspirations: ["premium market position", "consistent new clients"], desiredOutcomes: ["qualified inbound leads", "differentiated brand"], emotionalTriggers: ["reputation", "growth", "team exhaustion"], platforms: ["linkedin", "facebook"], isActive: true }),
    ]);
  }

  if (!angles.length) {
    await Promise.all([
      saveAngle({ label: "Operational Frustration", description: "The pain of manual, repetitive work that should be automated.", tags: ["pain", "operations", "efficiency"], platformAffinity: ["linkedin", "facebook"], isActive: true }),
      saveAngle({ label: "Anti-Generic Marketing", description: "Frustration with AI slop, generic content, and commoditized agencies.", tags: ["differentiation", "quality", "positioning"], platformAffinity: ["linkedin", "instagram"], isActive: true }),
    ]);
  }

  if (!hookStyles.length) {
    await Promise.all([
      saveHookStyle({ label: "Contrarian", description: "Challenge the conventional wisdom in the space.", example: "Everyone says you need more content. You need better systems.", isActive: true }),
      saveHookStyle({ label: "Operational Pain", description: "Open with a specific frustrating task or bottleneck.", example: "Writing 4 LinkedIn posts a week for 3 clients is not a content strategy.", isActive: true }),
    ]);
  }

  if (!ctaStyles.length) {
    await Promise.all([
      saveCTAStyle({ label: "Curiosity CTA", description: "Invite people to explore without pressure.", example: "Worth seeing how it works -> alpa.agency", isActive: true }),
      saveCTAStyle({ label: "Direct CTA", description: "Clear, confident, no-fluff action.", example: "Try ALPA free -> alpa.agency", isActive: true }),
    ]);
  }

  if (!negConstraints.length) {
    await Promise.all([
      saveNegativeConstraint({ category: "language", label: "Generic AI language", description: "Avoid words that signal generic AI output.", examples: ["leverage", "unlock", "game-changer", "revolutionize", "transform your"], isActive: true }),
      saveNegativeConstraint({ category: "tone", label: "Fake guru energy", description: "Never sound like a motivational speaker or hustle-culture influencer.", examples: ["crush it", "10x your results", "mindset shift", "level up"], isActive: true }),
    ]);
  }
}
