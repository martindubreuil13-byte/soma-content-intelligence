import { Search, Sparkles } from "lucide-react";
import type { AppWorkspaceContext } from "@/lib/workspace/workspace-context";

export function AppHeader({ context }: { context: AppWorkspaceContext }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-charcoal/82 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-peach/55">
            {context.organization.name}
          </p>
          <h1 className="mt-1 truncate font-display text-xl text-white sm:text-2xl">
            SOMA workspace
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="hidden items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/45 transition hover:bg-white/[0.07] hover:text-white/70 sm:flex">
            <Search size={15} />
            Search
          </button>
          <button className="flex items-center gap-2 rounded-2xl border border-plasma/20 bg-plasma/[0.08] px-3 py-2 text-sm font-semibold text-peach/80 transition hover:border-plasma/35 hover:bg-plasma/[0.12] hover:text-white">
            <Sparkles size={15} />
            New
          </button>
          <div className="hidden min-w-0 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 md:flex">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-semibold text-peach">
              {(context.user.email ?? "S").slice(0, 1).toUpperCase()}
            </div>
            <span className="max-w-[180px] truncate text-xs font-semibold text-white/52">
              {context.user.email ?? "Signed in"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
