"use client";

import { Loader2, PenLine } from "lucide-react";

type IdeaInputPanelProps = {
  idea: string;
  isGenerating: boolean;
  message?: string;
  error?: string;
  onIdeaChange: (idea: string) => void;
};

export function IdeaInputPanel({
  idea,
  isGenerating,
  message,
  error,
  onIdeaChange
}: IdeaInputPanelProps) {
  return (
    <section className="glass-panel rounded-[32px] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ember/75">Idea input</p>
          <h2 className="mt-1 font-display text-2xl text-white">Raw signal</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-plasma">
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <PenLine size={20} />}
        </div>
      </div>

      <textarea
        className="min-h-[150px] w-full resize-y rounded-[24px] border border-white/10 bg-charcoal/70 px-4 py-4 text-base leading-7 text-white outline-none transition duration-300 placeholder:text-white/32 focus:border-plasma/60 focus:bg-charcoal/90 focus:shadow-glow"
        disabled={isGenerating}
        onChange={(event) => onIdeaChange(event.target.value)}
        placeholder="Drop a raw idea, frustration, observation, positioning angle, or hook..."
        value={idea}
      />

      <div className="mt-3 min-h-5 text-sm">
        {error ? <p className="text-plasma">{error}</p> : null}
        {!error && message ? <p className="text-peach/70">{message}</p> : null}
      </div>
    </section>
  );
}
