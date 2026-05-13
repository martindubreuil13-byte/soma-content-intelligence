"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Calendar, Check, Clipboard, Download, ExternalLink, Loader2 } from "lucide-react";
import type { PublishingQueueItem, QueueItemStatus } from "@/lib/autopilot-types";
import { channelLabels } from "@/lib/content-types";

const statusConfig: Record<QueueItemStatus, { label: string; color: string }> = {
  approved: { label: "Ready to publish", color: "emerald" },
  scheduled: { label: "Scheduled", color: "peach" },
  posted_manual: { label: "Posted (manual)", color: "ember" },
  posted_auto: { label: "Posted (auto)", color: "ember" },
  failed: { label: "Failed", color: "plasma" }
};

const filterTabs: { id: QueueItemStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Ready" },
  { id: "scheduled", label: "Scheduled" },
  { id: "posted_manual", label: "Posted" },
  { id: "failed", label: "Failed" }
];

function QueueItemCard({
  item,
  onUpdate
}: {
  item: PublishingQueueItem;
  onUpdate: (id: string, updates: Partial<PublishingQueueItem>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);

  const config = statusConfig[item.status];

  async function handleMarkPosted() {
    setMarking(true);
    try {
      const response = await fetch(`/api/queue/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "posted_manual", publishedAt: new Date().toISOString() })
      });
      const result = (await response.json()) as { ok?: boolean; item?: PublishingQueueItem };
      if (result.ok && result.item) onUpdate(item.id, { status: "posted_manual", publishedAt: result.item.publishedAt });
    } finally {
      setMarking(false);
    }
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(item.captionExcerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-peach/60">
              {channelLabels[item.channel]}
            </span>
            <span
              className={clsx(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                config.color === "emerald" && "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
                config.color === "peach" && "border-peach/25 bg-peach/10 text-peach",
                config.color === "ember" && "border-ember/25 bg-ember/10 text-peach",
                config.color === "plasma" && "border-plasma/25 bg-plasma/10 text-peach"
              )}
            >
              {config.label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/70">{item.captionExcerpt}…</p>
        </div>
        {item.imagePath ? (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-charcoal/50">
            <img
              alt="Preview"
              className="h-full w-full object-cover"
              src={`/api/runs/${encodeURIComponent(item.runId)}/${item.channel}/image`}
            />
          </div>
        ) : null}
      </div>

      <p className="mb-4 text-[11px] text-white/35">
        Approved {new Date(item.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        {item.publishedAt
          ? ` · Published ${new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm font-semibold text-peach/80 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          onClick={handleCopyCaption}
          type="button"
        >
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
          {copied ? "Copied" : "Copy Caption"}
        </button>

        {item.imagePath ? (
          <a
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm font-semibold text-peach/80 transition hover:border-white/20 hover:text-white"
            download={`soma-${item.channel}-${item.runId}.png`}
            href={`/api/runs/${encodeURIComponent(item.runId)}/${item.channel}/image?download=1`}
          >
            <Download size={14} />
            Download Image
          </a>
        ) : null}

        <Link
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm font-semibold text-peach/80 transition hover:border-white/20 hover:text-white"
          href={`/review/${encodeURIComponent(item.runId)}`}
        >
          <ExternalLink size={14} />
          View Run
        </Link>

        {item.status === "approved" || item.status === "scheduled" ? (
          <button
            className="flex items-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/15 disabled:opacity-40"
            disabled={marking}
            onClick={handleMarkPosted}
            type="button"
          >
            {marking ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Mark as Posted
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function QueuePage() {
  const [items, setItems] = useState<PublishingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<QueueItemStatus | "all">("all");

  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((data: { items?: PublishingQueueItem[] }) => {
        setItems(data.items ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(id: string, updates: Partial<PublishingQueueItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  const filtered = activeFilter === "all" ? items : items.filter((i) => i.status === activeFilter);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">Content Autopilot</p>
          <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Publishing Queue</h1>
          <p className="mt-2 text-sm text-white/45">
            Approved content ready to copy, schedule, or mark as posted.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-charcoal/60 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              type="button"
              className={clsx(
                "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition",
                activeFilter === tab.id
                  ? "bg-white text-charcoal"
                  : "text-white/52 hover:bg-white/10 hover:text-white"
              )}
            >
              {tab.label}
              {tab.id !== "all" ? (
                <span className="ml-1.5 text-xs opacity-60">
                  {items.filter((i) => i.status === tab.id).length || ""}
                </span>
              ) : (
                <span className="ml-1.5 text-xs opacity-60">{items.length || ""}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-white/50">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm">Loading queue…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] p-10 text-center">
            <Calendar size={28} className="mb-4 text-peach/40" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/35">
              {activeFilter === "all" ? "Queue is empty" : `No ${activeFilter.replace("_", " ")} items`}
            </p>
            <h2 className="mt-3 font-display text-2xl text-white">Nothing here yet</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/45">
              Approve a caption and image in the Review Desk, then add them to the queue.
            </p>
            <Link
              href="/"
              className="mt-6 flex items-center gap-2 rounded-2xl border border-plasma/30 bg-plasma/[0.1] px-5 py-3 text-sm font-semibold text-peach transition hover:border-plasma/50 hover:bg-plasma/[0.16] hover:text-white"
            >
              Go to Today
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <QueueItemCard key={item.id} item={item} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
