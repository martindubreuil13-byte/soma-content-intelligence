import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-white/55">
      <Loader2 size={16} className="animate-spin text-peach/70" />
      {label}
    </div>
  );
}
