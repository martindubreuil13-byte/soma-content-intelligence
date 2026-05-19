import type { ContentChannel } from "@/lib/content-types";
import type { ExecutionJob } from "@/lib/db/execution-jobs-db";

export type WorkerResult = Record<string, unknown>;

export type WorkerHandler = (job: ExecutionJob) => Promise<WorkerResult>;

export type GenerationJobPayload = {
  idea?: string;
  source?: "manual" | "scheduled" | "morning";
};

export type ChannelJobPayload = {
  runId?: string;
  channel?: ContentChannel | string;
  visualTweak?: string;
};

export type SchedulerJobPayload = {
  force?: boolean;
  dev?: boolean;
  maxJobsPerRun?: number;
};

export type RunNextExecutionJobOptions = {
  workerId?: string;
  maxJobs?: number;
  staleAfterSeconds?: number;
};
