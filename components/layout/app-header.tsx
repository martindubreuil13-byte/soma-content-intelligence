import { Sparkles } from "lucide-react";
import type { AppWorkspaceContext } from "@/lib/workspace/workspace-context";

interface AppHeaderProps {
  context: AppWorkspaceContext;
  title?: string;
  subtitle?: string;
}

export function AppHeader({ context, title, subtitle }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 px-6 py-3.5 lg:px-8"
      style={{
        background: "rgba(12, 9, 16, 0.82)",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {subtitle && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
              {subtitle}
            </p>
          )}
          {title ? (
            <h1 className="mt-0.5 truncate font-display text-lg text-white/85">
              {title}
            </h1>
          ) : (
            <h1 className="truncate font-display text-lg text-white/85">
              {context.organization.name}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="flex items-center gap-2 rounded-[14px] border border-violet-soft/22 bg-violet-deep/10 px-3.5 py-2 text-sm font-semibold text-violet-pale/80 transition hover:border-violet-soft/38 hover:bg-violet-deep/18 hover:text-white"
          >
            <Sparkles size={14} />
            New mission
          </button>
          <div className="hidden min-w-0 items-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 md:flex">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-semibold text-soma-pearl">
              {(context.user.email ?? "S").slice(0, 1).toUpperCase()}
            </div>
            <span className="max-w-[160px] truncate text-xs font-semibold text-white/42">
              {context.user.email ?? "Signed in"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
