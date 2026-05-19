import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";

interface ActionCardProps {
  title: string;
  description?: string;
  href: string;
  count?: number;
  badge?: string;
  variant?: "default" | "primary" | "ghost";
  className?: string;
  icon?: React.ReactNode;
}

const variants = {
  default: "border border-white/[0.08] bg-soma-card/60 hover:border-white/[0.14] hover:bg-soma-card",
  primary: "border border-violet-soft/25 bg-violet-deep/12 hover:border-violet-soft/40 hover:bg-violet-deep/20",
  ghost:   "border border-white/[0.05] bg-transparent hover:border-white/[0.1] hover:bg-white/[0.03]",
};

export function ActionCard({ title, description, href, count, badge, variant = "default", className, icon }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "group relative flex flex-col gap-2 rounded-[18px] p-4 transition duration-200",
        variants[variant],
        className
      )}
    >
      <div className="violet-line absolute left-0 right-0 top-0 h-px opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-white/40 group-hover:text-violet-pale transition">{icon}</span>}
          <span className="text-sm font-semibold text-white/75 group-hover:text-white transition">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-violet-soft/20 px-2 py-0.5 text-[11px] font-semibold text-violet-pale">
              {count}
            </span>
          )}
          {badge && (
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/35">
              {badge}
            </span>
          )}
          <ArrowRight size={13} className="text-white/25 group-hover:text-white/50 transition" />
        </div>
      </div>

      {description && (
        <p className="text-xs text-white/38 leading-5">{description}</p>
      )}
    </Link>
  );
}
