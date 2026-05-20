"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, ChevronRight, Clock, Layers, Settings, X } from "lucide-react";
import { MaturityIndicator } from "@/components/soma/maturity-indicator";
import type { OnboardingProfile } from "@/lib/onboarding/onboarding-types";

export interface PreparedRun {
  id: string;
  preview: string;
  statusLabel: string;
  statusColor: "emerald" | "violet" | "amber" | "neutral";
}

export interface DrawerSummary {
  score: number;
  stage: string;
  stageDescription: string;
  evaluatedSamples: number;
  approved: number;
}

interface ContextDrawerProps {
  summary: DrawerSummary;
  preparedRuns: PreparedRun[];
  queueCount: number;
  activeJobCount: number;
  isFirstContact?: boolean;
  onboardingDraft?: OnboardingProfile;
  visualReferenceCount?: number;
}

const statusBadge: Record<PreparedRun["statusColor"], string> = {
  emerald: "border-emerald-300/20 bg-emerald-300/6 text-emerald-200/70",
  violet:  "border-violet-soft/22 bg-violet-deep/10 text-violet-pale",
  amber:   "border-soma-rose/20 bg-soma-rose/6 text-soma-pearl",
  neutral: "border-white/[0.07] bg-transparent text-white/30",
};

const quickNav = [
  { href: "/memory",   icon: Brain,    label: "Memory report" },
  { href: "/assets",   icon: Layers,   label: "Asset library" },
  { href: "/queue",    icon: Clock,    label: "Publishing queue" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function ContextDrawer({
  summary,
  preparedRuns,
  queueCount,
  activeJobCount,
  isFirstContact = false,
  onboardingDraft,
  visualReferenceCount = 0,
}: ContextDrawerProps) {
  const [open, setOpen] = useState(false);

  const approvalRate =
    summary.evaluatedSamples > 0
      ? Math.round((summary.approved / summary.evaluatedSamples) * 100)
      : 0;

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="group mt-14 flex w-full items-center gap-4"
      >
        <div className="h-px flex-1 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }} />
        <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.32em] text-white/18 transition-colors group-hover:text-white/38">
          Context
          <ChevronRight size={8} className="text-white/14 transition group-hover:text-white/30" />
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <div
        className={`
          fixed z-50 flex flex-col overflow-hidden
          transition-transform duration-300 ease-out
          lg:inset-y-0 lg:right-0 lg:w-[340px]
          max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-[22px]
          ${open ? "translate-x-0 translate-y-0" : "lg:translate-x-full max-lg:translate-y-full"}
        `}
        style={{
          background: "linear-gradient(175deg, #141020 0%, #0F0C17 60%, #0C0A14 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.055)",
          borderTop: "1px solid rgba(255,255,255,0.055)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(128,112,184,0.05)",
          maxHeight: "100vh",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/30">
            Context
          </p>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.03] p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/62"
          >
            <X size={13} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-7 px-5 py-5">

            {/* What SOMA understands */}
            <section>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.26em] text-white/25">
                {isFirstContact ? "What SOMA is learning" : "What SOMA remembers"}
              </p>
              {isFirstContact ? (
                <div className="space-y-2 text-[12px] leading-5 text-white/30">
                  <p>{onboardingDraft?.audience ? "Audience is starting to form." : "Audience is still open."}</p>
                  <p>{onboardingDraft?.corePain ? "The main struggle is coming into focus." : "The main struggle is not clear yet."}</p>
                  <p>{onboardingDraft?.offer ? "The offer is beginning to take shape." : "The offer still needs a sharper explanation."}</p>
                  <p>{onboardingDraft?.brandTone ? "Tone is beginning to emerge." : "Tone is not clear yet."}</p>
                  <p>{visualReferenceCount > 0 ? "Visual memory has a first reference." : "Visual memory is still empty."}</p>
                  <p>No approved creative direction yet.</p>
                </div>
              ) : (
                <>
                  <MaturityIndicator score={summary.score} compact />
                  <div className="mt-3 space-y-1 text-[12px] leading-5 text-white/30">
                    <p>— {summary.stage}: {summary.stageDescription}</p>
                    {summary.evaluatedSamples > 0 ? (
                      <p>
                        — {summary.evaluatedSamples} piece{summary.evaluatedSamples !== 1 ? "s" : ""} reviewed
                        {" · "}{approvalRate}% approved
                      </p>
                    ) : (
                      <p>— No reviews yet. Learning from scratch.</p>
                    )}
                  </div>
                  <Link
                    href="/memory"
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-pale/45 transition hover:text-violet-pale"
                  >
                    Full memory report <ArrowRight size={10} />
                  </Link>
                </>
              )}
            </section>

            {/* What SOMA prepared */}
            {!isFirstContact && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/25">
                  What SOMA prepared
                </p>
                {preparedRuns.length > 0 && (
                  <span className="rounded-full border border-violet-soft/16 bg-violet-deep/8 px-2 py-0.5 text-[9px] font-semibold text-violet-pale/45">
                    {preparedRuns.length}
                  </span>
                )}
              </div>

              {preparedRuns.length === 0 ? (
                <p className="text-[12px] leading-5 text-white/22">
                  No drafts yet. Start a mission and I&apos;ll prepare content for your review.
                </p>
              ) : (
                <>
                  <div className="space-y-0.5">
                    {preparedRuns.slice(0, 5).map((run) => (
                      <Link
                        key={run.id}
                        href={`/review/${encodeURIComponent(run.id)}`}
                        onClick={() => setOpen(false)}
                        className="group flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 transition hover:bg-white/[0.04]"
                      >
                        <p className="min-w-0 truncate text-[12px] text-white/35 transition group-hover:text-white/58">
                          {run.preview}
                        </p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusBadge[run.statusColor]}`}>
                          {run.statusLabel}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/review"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center gap-1.5 pl-2 text-[11px] font-semibold text-white/20 transition hover:text-white/45"
                  >
                    Open review <ArrowRight size={10} />
                  </Link>
                </>
              )}

              {activeJobCount > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-soft/60" />
                  <p className="text-[11px] text-white/32">
                    {activeJobCount} job{activeJobCount !== 1 ? "s" : ""} running now
                  </p>
                </div>
              )}
            </section>
            )}

            {/* Queue */}
            {queueCount > 0 && (
              <section>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.26em] text-white/25">
                  Queue
                </p>
                <Link
                  href="/queue"
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between rounded-[12px] border border-emerald-300/[0.1] bg-emerald-300/[0.03] px-3 py-2.5 transition hover:border-emerald-300/[0.18] hover:bg-emerald-300/[0.05]"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-emerald-300/40" />
                    <p className="text-[12px] text-emerald-200/50">
                      {queueCount} piece{queueCount !== 1 ? "s" : ""} ready to publish
                    </p>
                  </div>
                  <ArrowRight size={11} className="text-emerald-300/30 transition group-hover:text-emerald-300/60" />
                </Link>
              </section>
            )}

            {/* Quick nav */}
            <section>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.26em] text-white/25">
                Navigate
              </p>
              <div className="space-y-0.5">
                {quickNav.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-2.5 rounded-[10px] px-2 py-2 transition hover:bg-white/[0.04]"
                  >
                    <Icon size={13} className="text-white/22 transition group-hover:text-white/42" />
                    <span className="text-[12px] font-semibold text-white/32 transition group-hover:text-white/55">
                      {label}
                    </span>
                    <ArrowRight size={10} className="ml-auto text-white/12 transition group-hover:text-white/30" />
                  </Link>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
