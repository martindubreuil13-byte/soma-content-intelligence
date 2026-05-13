"use client";

import { Copy, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";

type ActionPanelProps = {
  canGenerate: boolean;
  canCopy: boolean;
  copied: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  isGenerating: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onGenerate: () => void;
};

export function ActionPanel({
  canGenerate,
  canCopy,
  copied,
  canDelete,
  isDeleting,
  isGenerating,
  onCopy,
  onDelete,
  onGenerate
}: ActionPanelProps) {
  const secondaryActions = [
    { label: "Regenerate", icon: RefreshCw }
  ];

  return (
    <aside className="glass-panel rounded-[28px] p-4 lg:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-peach/70">Controls</p>
          <h2 className="mt-1 font-display text-2xl text-white">Run actions</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-plasma">
          <Wand2 size={20} />
        </div>
      </div>

      <div className="grid gap-3">
        <button
          className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-plasma to-ember px-4 py-4 text-left text-sm font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:shadow-ember disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          disabled={!canGenerate || isGenerating}
          onClick={onGenerate}
          type="button"
        >
          <span>{isGenerating ? "Generating" : "Generate"}</span>
          <Sparkles
            className={isGenerating ? "animate-pulse" : "transition duration-300 group-hover:scale-110"}
            size={18}
          />
        </button>

        <button
          className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-left text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/40 hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          disabled={!canCopy}
          onClick={onCopy}
          type="button"
        >
          <span>{copied ? "Copied" : "Copy"}</span>
          <Copy className="transition duration-300 group-hover:scale-110" size={18} />
        </button>

        {secondaryActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-left text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/40 hover:bg-white/[0.1] hover:text-white"
              key={action.label}
              type="button"
            >
              <span>{action.label}</span>
              <Icon className="transition duration-300 group-hover:scale-110" size={18} />
            </button>
          );
        })}

        <button
          className="group flex items-center justify-between rounded-2xl border border-plasma/20 bg-plasma/[0.07] px-4 py-4 text-left text-sm font-semibold text-peach transition duration-300 hover:-translate-y-0.5 hover:border-plasma/55 hover:bg-plasma/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          disabled={!canDelete || isDeleting}
          onClick={onDelete}
          type="button"
        >
          <span>{isDeleting ? "Deleting" : "Delete"}</span>
          <Trash2 className="transition duration-300 group-hover:scale-110" size={18} />
        </button>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-charcoal/50 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Local mode</p>
        <p className="mt-3 text-sm leading-6 text-white/68">
          Generate writes the raw idea locally, runs Python, then refreshes the filesystem archive.
        </p>
      </div>
    </aside>
  );
}
