"use client";

import { CircleDot, Plus } from "lucide-react";

export function TopBar() {
  return (
    <header className="glass-panel flex flex-col gap-4 rounded-[30px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-peach/65">Local-first studio cockpit</p>
        <h1 className="mt-1 font-display text-3xl leading-none text-white sm:text-4xl">ALPA Content Engine</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-acid/20 bg-acid/10 px-4 py-2 text-sm font-medium text-acid">
          <CircleDot size={15} className="animate-pulse" />
          Local
        </div>
        <button
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-charcoal transition duration-300 hover:-translate-y-0.5 hover:bg-peach hover:shadow-ember"
          type="button"
        >
          <Plus size={17} />
          Generate New
        </button>
      </div>
    </header>
  );
}
