import { getAssetsForPromptContext, type PromptContextAsset } from "@/lib/assets/retrieval";
import { readFullIntelligence } from "@/lib/brand-intelligence";
import { getFeedbackLineage, listFeedbackLineageVersions } from "@/lib/db/feedback-lineage-db";
import {
  getGenerationRunByLegacyRunId,
  listGenerationChannels,
  listGenerationRuns,
  type GenerationRun,
} from "@/lib/db/generation-runs-db";
import { createOutputSnapshot } from "@/lib/db/generation-assets-db";
import { listLearningEvents, listPreferenceMemories } from "@/lib/db/intelligence-db";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";
import { getActiveInjections } from "@/lib/training-injections";
import type { ContentChannel } from "@/lib/content-types";
import type {
  AssembledGenerationContext,
  AssetContextBlock,
  BrandContextBlock,
  ContextAssemblyTrace,
  ContextAssemblyTraceItem,
  GenerationContextInput,
  IntelligenceContextBlock,
  LineageContextBlock,
  PreferenceContextBlock,
  RecentHistoryContextBlock,
  TrainingContextBlock,
} from "@/lib/context/context-types";

type TraceRecorder = {
  trace: ContextAssemblyTrace;
  push: (item: ContextAssemblyTraceItem) => void;
};

function createTrace(): TraceRecorder {
  const trace: ContextAssemblyTrace = { generatedAt: new Date().toISOString(), items: [] };
  return {
    trace,
    push: (item) => trace.items.push(item),
  };
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line?.trim())).join("\n");
}

async function optionalBlock<T>(trace: TraceRecorder, source: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const value = await loader();
    const count = Array.isArray(value) ? value.length : value && typeof value === "object" ? 1 : 0;
    trace.push({ source, status: count ? "included" : "empty", count });
    return value;
  } catch (error) {
    trace.push({
      source,
      status: "error",
      reason: error instanceof Error ? error.message : "Unknown context source error",
    });
    return fallback;
  }
}

function matchesText(value: string, input: GenerationContextInput) {
  const haystack = value.toLowerCase();
  const needles = [
    input.channel,
    input.objective,
    ...(input.rawIdea ?? "").toLowerCase().split(/\s+/).filter((word) => word.length > 4).slice(0, 8),
  ].filter(Boolean) as string[];

  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function scoreAsset(asset: PromptContextAsset, input: GenerationContextInput) {
  let score = 0;
  const reasons: string[] = [];
  const tags = asset.tags.map((tag) => tag.toLowerCase());

  if (asset.assetType === "logo") {
    score += 10;
    reasons.push("logo");
  }
  if (asset.assetType === "screenshot") {
    score += 8;
    reasons.push("screenshot");
  }
  if (asset.assetType === "visual_reference") {
    score += 6;
    reasons.push("visual reference");
  }
  if (asset.assetType === "training_example") {
    score += 5;
    reasons.push("training example");
  }
  if (input.channel && tags.includes(input.channel)) {
    score += 3;
    reasons.push(`tag:${input.channel}`);
  }
  if (tags.some((tag) => matchesText(tag, input)) || matchesText(asset.name, input) || matchesText(asset.description ?? "", input)) {
    score += 3;
    reasons.push("text match");
  }

  return { score, reasons };
}

export async function buildBrandContext(_input: GenerationContextInput, trace = createTrace()): Promise<BrandContextBlock> {
  const intelligence = await optionalBlock(trace, "brand_core", readFullIntelligence, null);
  const core = intelligence?.brandCore ?? null;
  return {
    core,
    summary: core
      ? compactLines([
          `Brand: ${core.brandName}`,
          `Positioning: ${core.positioning}`,
          `Voice: ${core.communicationStyle}`,
          `Value proposition: ${core.valueProposition}`,
          core.toneDescriptors.length ? `Tone descriptors: ${core.toneDescriptors.join(", ")}` : null,
          core.ctaPhilosophy ? `CTA philosophy: ${core.ctaPhilosophy}` : null,
        ])
      : "",
  };
}

export async function buildIntelligenceContext(input: GenerationContextInput, trace = createTrace()): Promise<IntelligenceContextBlock> {
  const full = await optionalBlock(trace, "brand_intelligence", readFullIntelligence, null);
  const channelFilter = (platforms: ContentChannel[]) => !input.channel || !platforms.length || platforms.includes(input.channel);
  const icps = (full?.icps ?? []).filter((item) => item.isActive).filter((item) => channelFilter(item.platforms)).slice(0, 4);
  const angles = (full?.angles ?? []).filter((item) => item.isActive).filter((item) => channelFilter(item.platformAffinity)).slice(0, 5);
  const hookStyles = (full?.hookStyles ?? []).filter((item) => item.isActive).slice(0, 5);
  const ctaStyles = (full?.ctaStyles ?? []).filter((item) => item.isActive).slice(0, 4);
  const constraints = (full?.negativeConstraints ?? []).filter((item) => item.isActive).slice(0, 8);

  trace.push({
    source: "intelligence_selection",
    status: icps.length || angles.length || constraints.length ? "included" : "empty",
    count: icps.length + angles.length + hookStyles.length + ctaStyles.length + constraints.length,
    ids: [...icps.map((item) => item.id), ...constraints.map((item) => item.id)],
  });

  return {
    icps,
    angles,
    hookStyles,
    ctaStyles,
    constraints,
    summary: compactLines([
      icps.length ? `ICPs: ${icps.map((item) => `${item.label}: ${item.description}`).join(" | ")}` : null,
      angles.length ? `Angles: ${angles.map((item) => `${item.label}: ${item.description}`).join(" | ")}` : null,
      hookStyles.length ? `Hook styles: ${hookStyles.map((item) => `${item.label}: ${item.example}`).join(" | ")}` : null,
      ctaStyles.length ? `CTA styles: ${ctaStyles.map((item) => `${item.label}: ${item.example}`).join(" | ")}` : null,
      constraints.length ? `Constraints: ${constraints.map((item) => `${item.label}: ${item.description}`).join(" | ")}` : null,
    ]),
  };
}

export async function buildPreferenceContext(_input: GenerationContextInput, trace = createTrace()): Promise<PreferenceContextBlock> {
  const [memories, learningEvents] = await Promise.all([
    optionalBlock(trace, "preference_memories", listPreferenceMemories, []),
    optionalBlock(trace, "learning_events", listLearningEvents, []),
  ]);

  return {
    memories,
    learningEvents: learningEvents.slice(-20),
    summary: compactLines([
      memories.length
        ? `Preference memory: ${memories.slice(0, 10).map((item) => `${item.key}=${JSON.stringify(item.value).slice(0, 180)}`).join(" | ")}`
        : null,
      learningEvents.length
        ? `Recent learning events: ${learningEvents.slice(-8).map((event) => `${event.channel}/${event.artifactType}/${event.action}`).join(", ")}`
        : null,
    ]),
  };
}

export async function buildAssetContext(input: GenerationContextInput, trace = createTrace()): Promise<AssetContextBlock> {
  const assetTypes = ["logo", "screenshot", "visual_reference", "training_example", "brand_document"] as const;
  const assets = (
    await Promise.all(
      assetTypes.map((assetType) =>
        optionalBlock(trace, `assets:${assetType}`, () =>
          getAssetsForPromptContext({
            assetType,
            isActive: true,
            includeSignedUrls: input.includeSignedAssetUrls ?? false,
            limit: 16,
          }), [])
      )
    )
  ).flat();
  const scored = assets
    .map((asset) => {
      const { score, reasons } = scoreAsset(asset, input);
      return { ...asset, relevanceScore: score, relevanceReasons: reasons };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  trace.push({
    source: "asset_relevance",
    status: scored.length ? "included" : "empty",
    count: scored.length,
    ids: scored.map((asset) => asset.id),
  });

  return {
    assets: scored,
    summary: scored.length
      ? `Assets: ${scored.map((asset) => `${asset.name} (${asset.assetType}, score ${asset.relevanceScore}, tags ${asset.tags.join(", ") || "none"})`).join(" | ")}`
      : "",
  };
}

export async function buildTrainingContext(input: GenerationContextInput, trace = createTrace()): Promise<TrainingContextBlock> {
  const appliesTo = input.objective === "image_generation" || input.objective === "visual_regeneration" ? "image" : "caption";
  const injections = await optionalBlock(trace, "training_injections", () => getActiveInjections(appliesTo), []);

  return {
    injections: injections.slice(0, 12),
    summary: injections.length
      ? `Training injections: ${injections.slice(0, 12).map((item) => `${item.label}: ${item.notes || item.sourceText.slice(0, 160)}`).join(" | ")}`
      : "",
  };
}

export async function buildLineageContext(input: GenerationContextInput, trace = createTrace()): Promise<LineageContextBlock> {
  const versions = await optionalBlock(trace, "feedback_lineage", async () => {
    if (input.channel && (input.legacyRunId || input.generationRunId)) {
      const current = await getFeedbackLineage({
        legacyRunId: input.legacyRunId ?? undefined,
        generationRunId: input.generationRunId ?? undefined,
        channel: input.channel,
      });
      return current?.versions ?? [];
    }

    return listFeedbackLineageVersions();
  }, []);

  const recent = versions.slice(-12);
  return {
    versions: recent,
    summary: recent.length
      ? `Feedback lineage: ${recent.map((item) => `${item.artifactType} v${item.versionNumber} ${item.status}${item.notes ? ` (${item.notes.slice(0, 90)})` : ""}`).join(" | ")}`
      : "",
  };
}

export async function buildRecentHistoryContext(input: GenerationContextInput, trace = createTrace()): Promise<RecentHistoryContextBlock> {
  const runs = await optionalBlock(trace, "recent_generation_runs", listGenerationRuns, []);
  const recentRuns = runs.slice(0, 6);
  const channelLists = await Promise.all(recentRuns.map((run) => listGenerationChannels(run.id).catch(() => [])));
  const channels = channelLists.flat().filter((channel) => !input.channel || channel.channel === input.channel).slice(0, 12);

  trace.push({
    source: "recent_generation_channels",
    status: channels.length ? "included" : "empty",
    count: channels.length,
    ids: channels.map((item) => item.id),
  });

  return {
    runs: recentRuns,
    channels,
    summary: compactLines([
      recentRuns.length ? `Recent runs: ${recentRuns.map((run) => `${run.legacyRunId ?? run.id}: ${run.rawIdea ?? run.title ?? run.status}`).join(" | ")}` : null,
      channels.length ? `Recent channel outputs: ${channels.map((item) => `${item.channel}: ${(item.caption ?? item.visualPrompt ?? "").slice(0, 140)}`).join(" | ")}` : null,
    ]),
  };
}

export function renderContextForPrompt(context: AssembledGenerationContext) {
  return compactLines([
    "--- SOMA UNIFIED CONTEXT ---",
    `Workspace: ${context.organization.name}${context.organization.slug ? ` (${context.organization.slug})` : ""}`,
    context.input.channel ? `Channel: ${context.input.channel}` : null,
    `Objective: ${context.input.objective}`,
    context.input.rawIdea ? `Raw idea: ${context.input.rawIdea}` : null,
    context.brand.summary ? `\n[Brand]\n${context.brand.summary}` : null,
    context.intelligence.summary ? `\n[Intelligence]\n${context.intelligence.summary}` : null,
    context.preferences.summary ? `\n[Preferences]\n${context.preferences.summary}` : null,
    context.assets.summary ? `\n[Assets]\n${context.assets.summary}` : null,
    context.training.summary ? `\n[Training]\n${context.training.summary}` : null,
    context.lineage.summary ? `\n[Feedback Lineage]\n${context.lineage.summary}` : null,
    context.recentHistory.summary ? `\n[Recent History]\n${context.recentHistory.summary}` : null,
    "--- END SOMA UNIFIED CONTEXT ---",
  ]);
}

export async function buildGenerationContext(input: GenerationContextInput): Promise<AssembledGenerationContext> {
  const context = await requireWorkspaceContext();
  const trace = createTrace();
  const [brand, intelligence, preferences, assets, training, lineage, recentHistory] = await Promise.all([
    buildBrandContext(input, trace),
    buildIntelligenceContext(input, trace),
    buildPreferenceContext(input, trace),
    buildAssetContext(input, trace),
    buildTrainingContext(input, trace),
    buildLineageContext(input, trace),
    buildRecentHistoryContext(input, trace),
  ]);
  const assembledWithoutText = {
    organization: {
      id: context.organization.id,
      name: context.organization.name,
      slug: context.organization.slug,
    },
    user: {
      id: context.user.id,
      email: context.user.email,
    },
    input,
    brand,
    intelligence,
    preferences,
    assets,
    training,
    lineage,
    recentHistory,
    promptText: "",
    trace: trace.trace,
  };
  const assembled: AssembledGenerationContext = {
    ...assembledWithoutText,
    promptText: renderContextForPrompt(assembledWithoutText),
  };

  if (input.persistSnapshot) {
    const run = input.generationRunId
      ? ({ id: input.generationRunId } as GenerationRun)
      : input.legacyRunId
        ? await getGenerationRunByLegacyRunId(input.legacyRunId).catch(() => null)
        : null;

    await createOutputSnapshot({
      generationRunId: run?.id ?? null,
      legacyRunId: input.legacyRunId,
      channel: input.channel,
      snapshotType: "assembled_context",
      content: {
        source_counts: Object.fromEntries(trace.trace.items.map((item) => [item.source, item.count ?? 0])),
        included_asset_ids: assets.assets.map((asset) => asset.id),
        selected_icp_ids: intelligence.icps.map((item) => item.id),
        selected_constraint_ids: intelligence.constraints.map((item) => item.id),
        selected_training_injection_ids: training.injections.map((item) => item.id),
        prompt_text: assembled.promptText,
        trace: trace.trace,
      },
    }).catch(() => {
      // Context snapshots are diagnostic; they should never block generation.
    });
  }

  return assembled;
}
