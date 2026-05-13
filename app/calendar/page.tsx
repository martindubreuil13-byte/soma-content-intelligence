import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { getContentRuns } from "@/lib/output-runs";
import { readPublishingQueue } from "@/lib/publishing-queue";
import type { ContentChannel } from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export default async function CalendarPage() {
  const [runs, queue] = await Promise.all([getContentRuns(), readPublishingQueue()]);
  const channels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

  const publishedItems = queue.filter((q) => q.status === "posted_manual" || q.status === "posted_auto");
  const scheduledItems = queue.filter((q) => q.status === "scheduled");
  const pendingItems = queue.filter((q) => q.status === "approved");

  const needsReviewRuns = runs.filter((run) => {
    return channels.some((ch) => run.channels[ch].feedback.caption.status === "pending");
  });

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">Content Timeline</p>
          <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Calendar</h1>
          <p className="mt-2 text-sm text-white/45">
            Content timeline — past, present, and upcoming.
          </p>
        </div>

        {/* Summary strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Needs Review", value: needsReviewRuns.length, color: "plasma" as const },
            { label: "Ready to Publish", value: pendingItems.length, color: "emerald" as const },
            { label: "Scheduled", value: scheduledItems.length, color: "peach" as const },
            { label: "Published", value: publishedItems.length, color: "white" as const }
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/38">{label}</p>
              <p className={`mt-1 font-display text-3xl ${
                color === "plasma" ? "text-peach" :
                color === "emerald" ? "text-emerald-300" :
                color === "peach" ? "text-peach" :
                "text-white"
              }`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Pending review */}
        {needsReviewRuns.length > 0 && (
          <section className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-plasma/60">
              Needs Review ({needsReviewRuns.length})
            </p>
            <div className="grid gap-2">
              {needsReviewRuns.slice(0, 5).map((run) => (
                <Link
                  key={run.id}
                  href={`/review/${encodeURIComponent(run.id)}`}
                  className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/18 hover:bg-white/[0.07]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{run.timestamp}</p>
                    <p className="text-xs text-white/45 line-clamp-1">{run.hasOriginalIdea ? run.originalIdea : "Generated run"}</p>
                  </div>
                  <ArrowRight size={16} className="text-peach/50" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Ready to publish */}
        {pendingItems.length > 0 && (
          <section className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400/60">
              Ready to Publish ({pendingItems.length})
            </p>
            <div className="grid gap-2">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[20px] border border-emerald-300/12 bg-emerald-300/[0.04] px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-peach/60">{channelLabels[item.channel]}</p>
                    <p className="text-sm text-white/70 line-clamp-1">{item.captionExcerpt}</p>
                  </div>
                  <Link
                    href="/queue"
                    className="shrink-0 text-xs font-semibold text-emerald-300/70 hover:text-emerald-300 transition"
                  >
                    Queue →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Published */}
        {publishedItems.length > 0 && (
          <section className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/30">
              Published ({publishedItems.length})
            </p>
            <div className="grid gap-2">
              {publishedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/[0.025] px-4 py-3 opacity-70"
                >
                  <div>
                    <p className="text-xs font-semibold text-peach/50">{channelLabels[item.channel]}</p>
                    <p className="text-sm text-white/55 line-clamp-1">{item.captionExcerpt}</p>
                    {item.publishedAt && (
                      <p className="text-[10px] text-white/30">{formatDate(item.publishedAt)}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-semibold text-emerald-300/60">
                    {item.status === "posted_manual" ? "Manual" : "Auto"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {needsReviewRuns.length === 0 && queue.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] p-10 text-center">
            <CalendarDays size={28} className="mb-4 text-peach/35" />
            <h2 className="font-display text-2xl text-white">No content yet</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/45">
              Generate and review content to populate the calendar.
            </p>
            <Link
              href="/schedule"
              className="mt-6 flex items-center gap-2 rounded-2xl border border-plasma/30 bg-plasma/[0.1] px-5 py-3 text-sm font-semibold text-peach transition hover:border-plasma/50 hover:bg-plasma/[0.16] hover:text-white"
            >
              Generate content
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
