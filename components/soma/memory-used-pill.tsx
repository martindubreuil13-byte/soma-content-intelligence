import { clsx } from "clsx";

type MemoryType = "brand" | "audience" | "asset" | "rule" | "learning";

const typeConfig: Record<MemoryType, { label: string; color: string }> = {
  brand:    { label: "Brand",    color: "bg-violet-soft/15 text-violet-pale border-violet-soft/20" },
  audience: { label: "Audience", color: "bg-mist-rose/12 text-soma-pearl border-mist-rose/20" },
  asset:    { label: "Asset",    color: "bg-soma-rose/12 text-soma-rose border-soma-rose/20" },
  rule:     { label: "Rule",     color: "bg-white/[0.06] text-white/52 border-white/10" },
  learning: { label: "Learning", color: "bg-violet-muted/12 text-violet-pale border-violet-muted/20" },
};

interface MemoryUsedPillProps {
  label: string;
  type?: MemoryType;
  className?: string;
}

export function MemoryUsedPill({ label, type = "brand", className }: MemoryUsedPillProps) {
  const config = typeConfig[type];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        config.color,
        className
      )}
    >
      <span className="opacity-50 text-[8px]">◆</span>
      {label}
    </span>
  );
}
