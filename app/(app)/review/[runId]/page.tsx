import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getContentRuns } from "@/lib/output-runs";
import { getAgentTrainingSummary } from "@/lib/agent-training";
import { getQueueItemForRun } from "@/lib/publishing-queue";
import { ReviewShell } from "@/components/review-shell";
import type { ContentChannel } from "@/lib/content-types";
import type { PublishingQueueItem } from "@/lib/autopilot-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ runId: string }>;
};

export default async function ReviewPage({ params }: PageProps) {
  const { runId } = await params;
  const decodedRunId = decodeURIComponent(runId);
  const runs = await getContentRuns();
  const run = runs.find((r) => r.id === decodedRunId);

  if (!run) notFound();

  const [trainingSummary, queueItems] = await Promise.all([
    getAgentTrainingSummary(runs),
    Promise.all(
      (["linkedin", "facebook", "instagram", "tiktok"] as const).map((ch) =>
        getQueueItemForRun(decodedRunId, ch)
      )
    )
  ]);

  const queueMap: Record<ContentChannel, PublishingQueueItem | undefined> = {
    linkedin: queueItems[0],
    facebook: queueItems[1],
    instagram: queueItems[2],
    tiktok: queueItems[3]
  };

  return (
    <div className="min-h-screen">
      {/* Mobile back button */}
      <div className="sticky top-0 z-30 border-b border-white/[0.07] bg-charcoal/90 backdrop-blur-xl px-4 py-3 lg:hidden">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
        >
          <ArrowLeft size={16} />
          Today
        </Link>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-4xl">
          {/* Desktop back */}
          <div className="mb-6 hidden lg:block">
            <Link
              href="/"
              className="flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft size={15} />
              Back to Today
            </Link>
          </div>

          <ReviewShell
            run={run}
            runs={runs}
            trainingSummary={trainingSummary}
            initialQueueMap={queueMap}
          />
        </div>
      </div>
    </div>
  );
}
