import type { LearningEvent } from "@/lib/agent-training";
import type { PromptContextAsset } from "@/lib/assets/retrieval";
import type {
  Angle,
  BrandCore,
  CTAStyle,
  HookStyle,
  ICP,
  NegativeConstraint,
} from "@/lib/brand-intelligence";
import type { ContentChannel } from "@/lib/content-types";
import type { FeedbackLineageVersion } from "@/lib/db/feedback-lineage-db";
import type { GenerationChannel, GenerationRun } from "@/lib/db/generation-runs-db";
import type { PreferenceMemoryRow } from "@/lib/db/intelligence-db";
import type { TrainingInjection } from "@/lib/training-injections";

export type GenerationObjective =
  | "generation"
  | "caption_regeneration"
  | "visual_regeneration"
  | "image_generation"
  | "training_rebuild"
  | "scheduler_tick"
  | "general";

export type GenerationContextInput = {
  channel?: ContentChannel;
  objective: GenerationObjective;
  rawIdea?: string | null;
  legacyRunId?: string | null;
  generationRunId?: string | null;
  selectedAssetIds?: string[];
  includeSignedAssetUrls?: boolean;
  persistSnapshot?: boolean;
};

export type ContextAssemblyTraceItem = {
  source: string;
  status: "included" | "empty" | "missing" | "error";
  count?: number;
  reason?: string;
  ids?: string[];
};

export type ContextAssemblyTrace = {
  generatedAt: string;
  items: ContextAssemblyTraceItem[];
};

export type BrandContextBlock = {
  core: BrandCore | null;
  summary: string;
};

export type IntelligenceContextBlock = {
  icps: ICP[];
  angles: Angle[];
  hookStyles: HookStyle[];
  ctaStyles: CTAStyle[];
  constraints: NegativeConstraint[];
  summary: string;
};

export type PreferenceContextBlock = {
  memories: PreferenceMemoryRow[];
  learningEvents: LearningEvent[];
  summary: string;
};

export type AssetContextBlock = {
  assets: Array<PromptContextAsset & { relevanceScore: number; relevanceReasons: string[] }>;
  summary: string;
};

export type TrainingContextBlock = {
  injections: TrainingInjection[];
  summary: string;
};

export type LineageContextBlock = {
  versions: FeedbackLineageVersion[];
  summary: string;
};

export type RecentHistoryContextBlock = {
  runs: GenerationRun[];
  channels: GenerationChannel[];
  summary: string;
};

export type AssembledGenerationContext = {
  organization: {
    id: string;
    name: string;
    slug: string | null;
  };
  user: {
    id: string;
    email: string | null;
  };
  input: GenerationContextInput;
  brand: BrandContextBlock;
  intelligence: IntelligenceContextBlock;
  preferences: PreferenceContextBlock;
  assets: AssetContextBlock;
  training: TrainingContextBlock;
  lineage: LineageContextBlock;
  recentHistory: RecentHistoryContextBlock;
  promptText: string;
  trace: ContextAssemblyTrace;
};
