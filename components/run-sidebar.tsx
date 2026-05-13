"use client";

import { clsx } from "clsx";
import { Clock3, FolderClock } from "lucide-react";
import type { ContentRun } from "@/lib/content-types";

type RunSidebarProps = {
  runs: ContentRun[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
};

export function RunSidebar({ runs, selectedRunId, onSelectRun }: RunSidebarProps) {
  return (
    <aside className="glass-panel rounded-[28px] p-4 lg:min-h-[620px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-plasma/75">Archive</p>
          <h2 className="mt-1 font-display text-2xl text-white">Content runs</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-ember">
          <FolderClock size={20} />
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
        {!runs.length ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
            <p className="text-sm leading-6 text-white/58">
              No timestamped folders found in `outputs/` yet.
            </p>
          </div>
        ) : null}

        {runs.map((run) => {
          const active = run.id === selectedRunId;
          const ideaPreview =
            run.originalIdea.length > 82 ? `${run.originalIdea.slice(0, 79).trimEnd()}...` : run.originalIdea;

          return (
            <button
              className={clsx(
                "group min-w-[245px] rounded-3xl border p-4 text-left transition duration-300 lg:min-w-0",
                active
                  ? "border-plasma/60 bg-plasma/14 shadow-glow"
                  : "border-white/10 bg-white/[0.055] hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white/[0.085]"
              )}
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              type="button"
            >
              <div className="mb-4 flex items-center gap-2 text-xs text-peach/70">
                <Clock3 size={14} />
                <span>{run.timestamp}</span>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-white/72">&ldquo;{ideaPreview}&rdquo;</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
