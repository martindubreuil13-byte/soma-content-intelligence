import { clsx } from "clsx";

interface PremiumPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "subtle" | "highlight";
  noPadding?: boolean;
}

const variants = {
  default:   "border border-white/[0.08] bg-soma-card/80 shadow-panel",
  elevated:  "border border-white/[0.1] bg-soma-surface/70 shadow-panel backdrop-blur-xl",
  subtle:    "border border-white/[0.05] bg-white/[0.02]",
  highlight: "border border-violet-soft/20 bg-violet-deep/10 shadow-orb",
};

export function PremiumPanel({ children, className, variant = "default", noPadding = false }: PremiumPanelProps) {
  return (
    <div
      className={clsx(
        "rounded-[20px] overflow-hidden",
        variants[variant],
        !noPadding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
