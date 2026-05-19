import { readPersistentLearningSignals } from "@/lib/agent-training";
import { listFeedbackLineageVersions } from "@/lib/db/feedback-lineage-db";
import { savePreferenceMemory } from "@/lib/db/intelligence-db";
import type { ContentChannel, FeedbackStatus, FeedbackTarget } from "@/lib/content-types";

const preferenceCategories = [
  "preferred_visual_styles",
  "avoid_visual_patterns",
  "preferred_caption_tones",
  "avoid_caption_patterns",
  "preferred_emotional_themes",
  "operator_notes"
] as const;

type PreferenceCategory = (typeof preferenceCategories)[number];

type FeedbackEntry = {
  channel: ContentChannel;
  notes: string;
  status: FeedbackStatus;
  target: FeedbackTarget;
  tags?: string[];
};
type LegacyFeedbackStatus = FeedbackStatus | "neutral";

export type PreferenceMemory = Record<PreferenceCategory, string[]> & {
  last_updated: string;
  top_approved_tags: string[];
  top_rejected_tags: string[];
  channel_approved_tags: Partial<Record<ContentChannel, string[]>>;
  channel_rejected_tags: Partial<Record<ContentChannel, string[]>>;
};

function emptyPreferenceMemory(): PreferenceMemory {
  return {
    preferred_visual_styles: [],
    avoid_visual_patterns: [],
    preferred_caption_tones: [],
    avoid_caption_patterns: [],
    preferred_emotional_themes: [],
    operator_notes: [],
    last_updated: new Date().toISOString(),
    top_approved_tags: [],
    top_rejected_tags: [],
    channel_approved_tags: {},
    channel_rejected_tags: {}
  };
}

function isFeedbackStatus(value: unknown): value is LegacyFeedbackStatus {
  return value === "approved" || value === "rejected" || value === "pending" || value === "neutral";
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addCount(counts: Map<string, number>, value: string) {
  const cleanedValue = value.trim();

  if (!cleanedValue) {
    return;
  }

  counts.set(cleanedValue, (counts.get(cleanedValue) ?? 0) + 1);
}

function phraseFragments(notes: string) {
  return notes
    .split(/[\n,;.]+/)
    .map((fragment) => normalizeText(fragment))
    .filter((fragment) => fragment.length >= 4 && fragment.length <= 80);
}

function collectRepeatedPhrases(entries: FeedbackEntry[]) {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    phraseFragments(entry.notes).forEach((fragment) => addCount(counts, fragment));
  });

  return counts;
}

const patternRules: Array<{
  approvedCategory: PreferenceCategory;
  avoidedCategory: PreferenceCategory;
  label: string;
  keywords: string[];
  targets: FeedbackTarget[];
}> = [
  {
    approvedCategory: "preferred_visual_styles",
    avoidedCategory: "avoid_visual_patterns",
    label: "documentary realism",
    keywords: ["documentary", "realistic", "realism", "candid", "raw", "natural"],
    targets: ["image"]
  },
  {
    approvedCategory: "preferred_visual_styles",
    avoidedCategory: "avoid_visual_patterns",
    label: "less polished, more lived-in visuals",
    keywords: ["less polished", "too polished", "lived in", "imperfect", "authentic"],
    targets: ["image"]
  },
  {
    approvedCategory: "preferred_visual_styles",
    avoidedCategory: "avoid_visual_patterns",
    label: "minimal visual restraint",
    keywords: ["minimal", "minimalist", "simple", "restrained", "clean"],
    targets: ["image"]
  },
  {
    approvedCategory: "preferred_visual_styles",
    avoidedCategory: "avoid_visual_patterns",
    label: "environmental storytelling",
    keywords: ["environmental", "storytelling", "lifestyle", "airport", "office", "background", "scene"],
    targets: ["image"]
  },
  {
    approvedCategory: "avoid_visual_patterns",
    avoidedCategory: "avoid_visual_patterns",
    label: "fake SaaS or overdesigned startup visuals",
    keywords: ["fake saas", "startup", "hologram", "dashboard", "too much dashboard", "less dashboard"],
    targets: ["image"]
  },
  {
    approvedCategory: "preferred_caption_tones",
    avoidedCategory: "avoid_caption_patterns",
    label: "stronger hooks",
    keywords: ["hook", "stronger hook", "opening", "punchier"],
    targets: ["caption"]
  },
  {
    approvedCategory: "preferred_caption_tones",
    avoidedCategory: "avoid_caption_patterns",
    label: "operator-minded directness",
    keywords: ["direct", "operator", "practical", "sharp", "clear"],
    targets: ["caption"]
  },
  {
    approvedCategory: "avoid_caption_patterns",
    avoidedCategory: "avoid_caption_patterns",
    label: "generic or corporate copy",
    keywords: ["generic", "corporate", "salesy", "hype", "ai sounding"],
    targets: ["caption"]
  },
  {
    approvedCategory: "preferred_emotional_themes",
    avoidedCategory: "preferred_emotional_themes",
    label: "emotional tension",
    keywords: ["emotional", "tension", "fatigue", "relief", "pressure", "human"],
    targets: ["caption", "image"]
  }
];

function collectKeywordPatterns(entries: FeedbackEntry[]) {
  const categoryCounts = Object.fromEntries(preferenceCategories.map((category) => [category, new Map<string, number>()])) as Record<
    PreferenceCategory,
    Map<string, number>
  >;

  entries.forEach((entry) => {
    const normalizedNotes = normalizeText(entry.notes);

    patternRules.forEach((rule) => {
      if (!rule.targets.includes(entry.target)) {
        return;
      }

      if (!rule.keywords.some((keyword) => normalizedNotes.includes(keyword))) {
        return;
      }

      const category = entry.status === "approved" ? rule.approvedCategory : rule.avoidedCategory;
      addCount(categoryCounts[category], rule.label);
    });
  });

  return categoryCounts;
}

function getFeedbackSectionEntries({
  channel,
  notes,
  status,
  tags,
  target
}: {
  channel: ContentChannel;
  notes: unknown;
  status: unknown;
  tags?: string[];
  target: FeedbackTarget;
}): FeedbackEntry[] {
  const feedbackStatus = isFeedbackStatus(status) ? status : "pending";
  const feedbackNotes = typeof notes === "string" ? notes.trim() : "";

  if (feedbackStatus === "neutral" || feedbackStatus === "pending" || (!feedbackNotes && !tags?.length)) {
    return [];
  }

  const normalizedStatus: FeedbackStatus = feedbackStatus;

  return [
    {
      channel,
      notes: feedbackNotes,
      status: normalizedStatus,
      target,
      ...(tags?.length ? { tags } : {})
    }
  ];
}

function sortedRepeatedValues(counts: Map<string, number>, minimumCount = 2, limit = 8) {
  return Array.from(counts.entries())
    .filter(([, count]) => count >= minimumCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function mergeUnique(...values: string[][]) {
  return Array.from(new Set(values.flat().filter(Boolean)));
}

async function readFeedbackEntries() {
  const entries: FeedbackEntry[] = [];

  try {
    const lineageVersions = await listFeedbackLineageVersions();
    entries.push(
      ...lineageVersions.flatMap((version) => {
        const channel = typeof version.metadata.channel === "string" ? version.metadata.channel : "";
        if (channel !== "linkedin" && channel !== "facebook" && channel !== "instagram" && channel !== "tiktok") {
          return [];
        }

        return getFeedbackSectionEntries({
          channel,
          notes: version.notes,
          status: version.status,
          tags: version.tags,
          target: version.artifactType === "visualPrompt" ? "image" : version.artifactType
        });
      })
    );
  } catch {
    // Keep preference rebuild non-blocking if lineage tables are not migrated yet.
  }

  const persistentSignals = await readPersistentLearningSignals();

  entries.push(
    ...persistentSignals.flatMap((event) =>
      getFeedbackSectionEntries({
        channel: event.channel,
        notes: event.notes,
        status: event.action,
        target: event.artifactType
      })
    )
  );

  return Array.from(
    new Map(entries.map((entry) => [`${entry.channel}:${entry.target}:${entry.status}:${entry.notes}`, entry])).values()
  );
}

function collectTagCounts(entries: FeedbackEntry[]) {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    entry.tags?.forEach((tag) => addCount(counts, tag));
  });
  return counts;
}

function collectTagCountsByChannel(entries: FeedbackEntry[]) {
  const byChannel = new Map<ContentChannel, Map<string, number>>();
  entries.forEach((entry) => {
    if (!entry.tags?.length) return;
    const counts = byChannel.get(entry.channel) ?? new Map<string, number>();
    entry.tags.forEach((tag) => addCount(counts, tag));
    byChannel.set(entry.channel, counts);
  });
  return byChannel;
}

export async function rebuildPreferenceMemory() {
  const entries = await readFeedbackEntries();
  const approvedEntries = entries.filter((entry) => entry.status === "approved");
  const rejectedEntries = entries.filter((entry) => entry.status === "rejected");
  const approvedCaptionEntries = approvedEntries.filter((entry) => entry.target === "caption");
  const rejectedCaptionEntries = rejectedEntries.filter((entry) => entry.target === "caption");
  const approvedImageEntries = approvedEntries.filter((entry) => entry.target === "image");
  const rejectedImageEntries = rejectedEntries.filter((entry) => entry.target === "image");
  const approvedPhrases = collectRepeatedPhrases(approvedEntries);
  const rejectedPhrases = collectRepeatedPhrases(rejectedEntries);
  const approvedCaptionPhrases = collectRepeatedPhrases(approvedCaptionEntries);
  const rejectedCaptionPhrases = collectRepeatedPhrases(rejectedCaptionEntries);
  const approvedImagePhrases = collectRepeatedPhrases(approvedImageEntries);
  const rejectedImagePhrases = collectRepeatedPhrases(rejectedImageEntries);
  const keywordPatterns = collectKeywordPatterns(entries);
  const memory = emptyPreferenceMemory();

  memory.preferred_visual_styles = mergeUnique(
    sortedRepeatedValues(keywordPatterns.preferred_visual_styles),
    sortedRepeatedValues(approvedImagePhrases).filter((phrase) =>
      ["documentary", "visual", "style", "dashboard", "lifestyle", "polished", "minimal", "candid", "archetype", "asset"].some((keyword) =>
        phrase.includes(keyword)
      )
    )
  ).slice(0, 8);
  memory.avoid_visual_patterns = mergeUnique(
    sortedRepeatedValues(keywordPatterns.avoid_visual_patterns),
    sortedRepeatedValues(rejectedImagePhrases).filter((phrase) =>
      ["visual", "dashboard", "saas", "polished", "cinematic", "fake", "generic", "asset"].some((keyword) => phrase.includes(keyword))
    )
  ).slice(0, 8);
  memory.preferred_caption_tones = mergeUnique(
    sortedRepeatedValues(keywordPatterns.preferred_caption_tones),
    sortedRepeatedValues(approvedCaptionPhrases).filter((phrase) =>
      ["hook", "tone", "cta", "paragraph", "rhythm", "direct", "sharp", "operator"].some((keyword) => phrase.includes(keyword))
    )
  ).slice(0, 8);
  memory.avoid_caption_patterns = mergeUnique(
    sortedRepeatedValues(keywordPatterns.avoid_caption_patterns),
    sortedRepeatedValues(rejectedCaptionPhrases).filter((phrase) =>
      ["hook", "tone", "cta", "paragraph", "rhythm", "generic", "corporate", "salesy"].some((keyword) => phrase.includes(keyword))
    )
  ).slice(0, 8);
  memory.preferred_emotional_themes = mergeUnique(sortedRepeatedValues(keywordPatterns.preferred_emotional_themes)).slice(0, 8);
  memory.operator_notes = mergeUnique(sortedRepeatedValues(approvedPhrases, 2, 5), sortedRepeatedValues(rejectedPhrases, 2, 5)).slice(0, 10);

  // Tag-based learning: aggregate structured approval/rejection tags
  const approvedTagCounts = collectTagCounts(approvedEntries);
  const rejectedTagCounts = collectTagCounts(rejectedEntries);
  memory.top_approved_tags = Array.from(approvedTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
  memory.top_rejected_tags = Array.from(rejectedTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  const approvedByChannel = collectTagCountsByChannel(approvedEntries);
  const rejectedByChannel = collectTagCountsByChannel(rejectedEntries);
  memory.channel_approved_tags = Object.fromEntries(
    Array.from(approvedByChannel.entries()).map(([ch, counts]) => [
      ch,
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag)
    ])
  ) as Partial<Record<ContentChannel, string[]>>;
  memory.channel_rejected_tags = Object.fromEntries(
    Array.from(rejectedByChannel.entries()).map(([ch, counts]) => [
      ch,
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag)
    ])
  ) as Partial<Record<ContentChannel, string[]>>;

  memory.last_updated = new Date().toISOString();

  await savePreferenceMemory(memory);

  return memory;
}
