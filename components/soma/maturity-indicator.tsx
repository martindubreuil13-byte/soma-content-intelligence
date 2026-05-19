import { clsx } from "clsx";

const LEVELS = [
  { label: "Observer",         min: 0,   description: "Learning your business" },
  { label: "Apprentice",       min: 20,  description: "Drafting with supervision" },
  { label: "Junior Operator",  min: 40,  description: "Producing usable content" },
  { label: "Senior Operator",  min: 65,  description: "Preparing content with light review" },
  { label: "Autonomous Agent", min: 85,  description: "Trusted to execute delegated tasks" },
];

function getLevel(score: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

interface MaturityIndicatorProps {
  score: number;
  compact?: boolean;
  className?: string;
}

export function MaturityIndicator({ score, compact = false, className }: MaturityIndicatorProps) {
  const level = getLevel(score);
  const nextLevel = LEVELS[level.index + 1];
  const segmentWidth = nextLevel
    ? ((score - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  if (compact) {
    return (
      <div className={clsx("flex items-center gap-2.5", className)}>
        <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-soft to-mist-rose transition-all duration-700"
            style={{ width: `${segmentWidth}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-white/55">{level.label}</span>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-white/80">{level.label}</span>
        <span className="font-display text-lg text-soma-pearl">{score}<span className="text-sm text-white/35">/100</span></span>
      </div>

      {/* 5-segment track */}
      <div className="flex items-center gap-0.5">
        {LEVELS.map((lvl, i) => {
          const isComplete = i < level.index;
          const isCurrent = i === level.index;
          return (
            <div
              key={lvl.label}
              className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.07]"
            >
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-700",
                  isComplete
                    ? "bg-gradient-to-r from-violet-soft to-mist-rose w-full"
                    : isCurrent
                    ? "bg-gradient-to-r from-violet-soft to-mist-rose"
                    : "w-0"
                )}
                style={isCurrent ? { width: `${segmentWidth}%` } : undefined}
              />
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-white/38">{level.description}</p>

      {nextLevel && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Next: {nextLevel.label} at {nextLevel.min}
        </p>
      )}
    </div>
  );
}
