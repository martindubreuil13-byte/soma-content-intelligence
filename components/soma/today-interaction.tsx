"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AgentComposer } from "@/components/soma/agent-composer";

interface TodayInteractionProps {
  primaryLabel: string;
  suggestions?: string[];
  placeholder?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function TodayInteraction({
  primaryLabel,
  suggestions = [],
  placeholder,
  secondaryLabel,
  secondaryHref,
}: TodayInteractionProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  if (composerOpen) {
    return (
      <div className="mt-10 w-full animate-fade-up">
        <AgentComposer suggestions={suggestions} placeholder={placeholder} />

        <div className="mt-4 flex items-center justify-center gap-4">
          {secondaryLabel && secondaryHref ? (
            <Link
              href={secondaryHref}
              className="text-[12px] text-white/28 transition hover:text-white/50"
            >
              {secondaryLabel} →
            </Link>
          ) : null}
          <button
            onClick={() => setComposerOpen(false)}
            className="text-[11px] text-white/18 transition hover:text-white/35"
          >
            × close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <button
        onClick={() => setComposerOpen(true)}
        className="group flex items-center gap-3 rounded-[18px] border border-violet-soft/25 bg-violet-deep/12 px-7 py-3.5 text-sm font-semibold text-violet-pale transition duration-200 hover:border-violet-soft/42 hover:bg-violet-deep/20 hover:text-white"
      >
        {primaryLabel}
        <ArrowRight size={15} className="transition duration-200 group-hover:translate-x-0.5" />
      </button>

      {secondaryLabel && secondaryHref ? (
        <Link
          href={secondaryHref}
          className="text-[13px] text-white/30 transition hover:text-white/52"
        >
          {secondaryLabel} <span className="text-white/18">→</span>
        </Link>
      ) : null}
    </div>
  );
}
