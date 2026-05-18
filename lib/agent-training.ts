import type { ContentChannel, ContentRun, FeedbackStatus, FeedbackTarget, FeedbackVersion } from "@/lib/content-types";
import {
  createLearningEvent as createLearningEventDb,
  listLearningEvents,
} from "@/lib/db/intelligence-db";

export type TrainingStage =
  | "Observer"
  | "Intern"
  | "Junior Operator"
  | "Operator"
  | "Senior Operator"
  | "Specialist"
  | "Autonomous Operator"
  | "Strategic Partner";

export type TrainingArtifactType = Extract<FeedbackTarget, "caption" | "image">;
export type LearningAction = "approved" | "rejected" | "regenerated" | "edited";

export type LearningEvent = {
  id: string;
  timestamp: string;
  runId: string;
  channel: ContentChannel;
  artifactType: TrainingArtifactType;
  artifactVersion: string;
  action: LearningAction;
  lineageId: string;
  regenerationIndex: number;
  isFirstPass: boolean;
  approvedAfterAttempts?: number;
  notes?: string;
  parentCaptionVersion?: string;
  sourcePromptId?: string;
  visualPromptId?: string;
  archetype?: string;
  conceptAngle?: string;
  promptExcerpt?: string;
};

export type TrainingSummary = {
  approved: number;
  evaluatedSamples: number;
  maturityCap: number;
  nextStage?: TrainingStage;
  rawScore: number;
  regenerationPenalty: number;
  rejected: number;
  score: number;
  stage: TrainingStage;
  stageDescription: string;
};

const stageThresholds: Array<{ max: number; stage: TrainingStage; description: string }> = [
  { max: 10, stage: "Observer", description: "Watching patterns and collecting first signals." },
  { max: 25, stage: "Intern", description: "Learning basic taste boundaries from reviewed work." },
  { max: 45, stage: "Junior Operator", description: "Starting to repeat what works with supervision." },
  { max: 70, stage: "Operator", description: "Useful alignment is forming across captions and images." },
  { max: 85, stage: "Senior Operator", description: "Creative judgment is becoming more consistent." },
  { max: 93, stage: "Specialist", description: "Strong platform-specific preferences are taking shape." },
  { max: 98, stage: "Autonomous Operator", description: "High alignment, still kept under human review." },
  { max: 100, stage: "Strategic Partner", description: "Deep training history with stable creative judgment." }
];

function versionNumber(versionId: string) {
  const match = versionId.match(/_(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function eventKey(event: Pick<LearningEvent, "lineageId" | "action">) {
  return `${event.lineageId}:${event.action}`;
}

export function createLearningEvent({
  action,
  artifactType,
  channel,
  runId,
  version
}: {
  action: LearningAction;
  artifactType: TrainingArtifactType;
  channel: ContentChannel;
  runId: string;
  version: FeedbackVersion;
}): LearningEvent {
  const attempt = Math.max(1, versionNumber(version.id));
  const lineageId = `${runId}:${channel}:${artifactType}:${version.id}`;

  return {
    id: `${lineageId}:${action}`,
    timestamp: new Date().toISOString(),
    runId,
    channel,
    artifactType,
    artifactVersion: version.id,
    action,
    lineageId,
    regenerationIndex: version.regenerationIndex ?? attempt - 1,
    isFirstPass: attempt === 1,
    ...(action === "approved" ? { approvedAfterAttempts: attempt } : {}),
    ...(version.notes ? { notes: version.notes } : {}),
    ...(version.parentCaptionVersionId ? { parentCaptionVersion: version.parentCaptionVersionId } : {}),
    ...(version.sourceVisualPromptVersionId ? { sourcePromptId: version.sourceVisualPromptVersionId, visualPromptId: version.sourceVisualPromptVersionId } : {}),
    ...(version.archetype ? { archetype: version.archetype } : {}),
    ...(version.conceptAngle ? { conceptAngle: version.conceptAngle } : {}),
    ...(version.promptExcerpt ? { promptExcerpt: version.promptExcerpt } : {})
  };
}

function isLearningEvent(value: unknown): value is LearningEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Partial<LearningEvent> & {
    status?: unknown;
    target?: unknown;
    versionId?: unknown;
  };

  return (
    typeof record.runId === "string" &&
    typeof record.channel === "string" &&
    (record.artifactType === "caption" || record.artifactType === "image" || record.target === "caption" || record.target === "image") &&
    (record.action === "approved" ||
      record.action === "rejected" ||
      record.action === "regenerated" ||
      record.action === "edited" ||
      record.status === "approved" ||
      record.status === "rejected")
  );
}

function normalizeLearningEvent(value: unknown): LearningEvent | null {
  if (!isLearningEvent(value)) {
    return null;
  }

  const record = value as Partial<LearningEvent> & {
    createdAt?: string;
    feedback?: string;
    status?: Extract<FeedbackStatus, "approved" | "rejected">;
    target?: TrainingArtifactType;
    versionId?: string;
  };
  const artifactType = record.artifactType ?? record.target;
  const artifactVersion = record.artifactVersion ?? record.versionId;
  const action = record.action ?? record.status;

  if (!artifactType || !artifactVersion || !action) {
    return null;
  }

  const lineageId = record.lineageId ?? `${record.runId}:${record.channel}:${artifactType}:${artifactVersion}`;
  const attempt = Math.max(1, versionNumber(artifactVersion));

  return {
    id: record.id ?? `${lineageId}:${action}`,
    timestamp: record.timestamp ?? record.createdAt ?? new Date().toISOString(),
    runId: record.runId!,
    channel: record.channel as ContentChannel,
    artifactType,
    artifactVersion,
    action,
    lineageId,
    regenerationIndex: record.regenerationIndex ?? attempt - 1,
    isFirstPass: record.isFirstPass ?? attempt === 1,
    ...(record.approvedAfterAttempts ? { approvedAfterAttempts: record.approvedAfterAttempts } : action === "approved" ? { approvedAfterAttempts: attempt } : {}),
    ...(record.notes ?? record.feedback ? { notes: record.notes ?? record.feedback } : {}),
    ...(record.parentCaptionVersion ? { parentCaptionVersion: record.parentCaptionVersion } : {}),
    ...(record.sourcePromptId ? { sourcePromptId: record.sourcePromptId } : {}),
    ...(record.visualPromptId ? { visualPromptId: record.visualPromptId } : {}),
    ...(record.archetype ? { archetype: record.archetype } : {}),
    ...(record.conceptAngle ? { conceptAngle: record.conceptAngle } : {}),
    ...(record.promptExcerpt ? { promptExcerpt: record.promptExcerpt } : {})
  };
}

export function getMaturityCap(evaluatedSamples: number) {
  if (evaluatedSamples <= 5) return 25;
  if (evaluatedSamples <= 15) return 45;
  if (evaluatedSamples <= 30) return 65;
  if (evaluatedSamples <= 60) return 80;
  if (evaluatedSamples <= 100) return 92;
  return 100;
}

export function getTrainingStage(score: number) {
  const match = stageThresholds.find((threshold) => score <= threshold.max) ?? stageThresholds.at(-1)!;
  const currentIndex = stageThresholds.findIndex((threshold) => threshold.stage === match.stage);

  return {
    description: match.description,
    nextStage: stageThresholds[currentIndex + 1]?.stage,
    stage: match.stage
  };
}

export function getLearningEventScore(event: LearningEvent) {
  if (event.action === "regenerated" || event.action === "edited") {
    return 0;
  }

  if (event.action === "rejected") {
    return event.artifactType === "caption" ? -1.5 : -1;
  }

  const firstPassBonus = event.isFirstPass ? (event.artifactType === "caption" ? 3 : 4) : 0;
  const baseApproval = event.artifactType === "caption" ? 2 : 3;
  const lateAttemptPenalty = Math.min(Math.max(0, (event.approvedAfterAttempts ?? 1) - 1) * 0.45, baseApproval * 0.65);

  return baseApproval + firstPassBonus - lateAttemptPenalty;
}

export function calculateRegenerationPenalty(events: LearningEvent[]) {
  const regenerated = events.filter((event) => event.action === "regenerated").length;
  const maxRegenerationIndex = events.reduce((max, event) => Math.max(max, event.regenerationIndex), 0);

  return -(regenerated * 0.25 + maxRegenerationIndex * 0.25);
}

export async function readPersistentLearningSignals() {
  return listLearningEvents();
}

export async function appendPersistentLearningSignal(event: LearningEvent) {
  return createLearningEventDb(event);
}

function versionToEvents({
  artifactType,
  channel,
  runId,
  version
}: {
  artifactType: TrainingArtifactType;
  channel: ContentChannel;
  runId: string;
  version: FeedbackVersion;
}) {
  const events: LearningEvent[] = [];

  if (version.generationType !== "initial") {
    events.push(createLearningEvent({ action: "regenerated", artifactType, channel, runId, version }));
  }

  if (version.status === "approved" || version.status === "rejected") {
    events.push(createLearningEvent({ action: version.status, artifactType, channel, runId, version }));
  }

  return events;
}

export function extractLearningSignalsFromRuns(runs: ContentRun[]) {
  return runs.flatMap((run) =>
    Object.entries(run.channels).flatMap(([channelKey, channelPackage]) => {
      const channel = channelKey as ContentChannel;

      return [
        ...channelPackage.feedbackLineage.captionVersions.flatMap((version) =>
          versionToEvents({ artifactType: "caption", channel, runId: run.id, version })
        ),
        ...channelPackage.feedbackLineage.imageVersions.flatMap((version) =>
          versionToEvents({ artifactType: "image", channel, runId: run.id, version })
        )
      ];
    })
  );
}

export function calculateTrainingSummary(events: LearningEvent[]): TrainingSummary {
  const uniqueEvents = Array.from(new Map(events.map((event) => [eventKey(event), event])).values());
  const evaluatedEvents = uniqueEvents.filter((event) => event.action === "approved" || event.action === "rejected");
  const approved = evaluatedEvents.filter((event) => event.action === "approved").length;
  const rejected = evaluatedEvents.filter((event) => event.action === "rejected").length;
  const evaluatedSamples = evaluatedEvents.length;
  const eventScore = evaluatedEvents.reduce((score, event) => score + getLearningEventScore(event), 0);
  const regenerationPenalty = calculateRegenerationPenalty(uniqueEvents);
  const pairedApprovals = new Map<string, Set<TrainingArtifactType>>();

  evaluatedEvents.forEach((event) => {
    if (event.action !== "approved") {
      return;
    }

    const key = event.parentCaptionVersion
      ? `${event.runId}:${event.channel}:${event.parentCaptionVersion}`
      : `${event.runId}:${event.channel}:${event.artifactVersion}`;

    const artifactTypes = pairedApprovals.get(key) ?? new Set<TrainingArtifactType>();

    artifactTypes.add(event.artifactType);
    pairedApprovals.set(key, artifactTypes);
  });

  const latestPairBonus = Array.from(pairedApprovals.values()).filter(
    (artifactTypes) => artifactTypes.has("caption") && artifactTypes.has("image")
  ).length * 4;
  const rawScore = Math.max(0, Math.min(100, eventScore + latestPairBonus + regenerationPenalty));
  const maturityCap = getMaturityCap(evaluatedSamples);
  const score = Math.min(rawScore, maturityCap);
  const stageResult = getTrainingStage(score);

  return {
    approved,
    evaluatedSamples,
    maturityCap,
    nextStage: stageResult.nextStage,
    rawScore,
    regenerationPenalty,
    rejected,
    score,
    stage: stageResult.stage,
    stageDescription: stageResult.description
  };
}

export async function getAgentTrainingSummary(runs: ContentRun[]) {
  const persistentEvents = await readPersistentLearningSignals();
  const temporaryEvents = extractLearningSignalsFromRuns(runs);

  return calculateTrainingSummary([...persistentEvents, ...temporaryEvents]);
}
