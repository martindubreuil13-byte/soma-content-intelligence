"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers, Mic, Paperclip } from "lucide-react";

interface AgentComposerProps {
  suggestions?: string[];
  placeholder?: string;
}

export function AgentComposer({ suggestions = [], placeholder }: AgentComposerProps) {
  const [input, setInput] = useState("");
  const router = useRouter();

  const effectivePlaceholder =
    placeholder ?? "Share a thought, describe what you want to create, or give SOMA direction…";

  function handleSend() {
    if (!input.trim()) return;
    router.push("/missions");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  }

  return (
    <div className="space-y-3">
      {/* Main composer glass surface */}
      <div
        className="overflow-hidden rounded-[22px]"
        style={{
          border: "1px solid rgba(255,255,255,0.09)",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
          boxShadow:
            "0 28px 80px rgba(0,0,0,0.42), 0 0 0 1px rgba(128,112,184,0.06), inset 0 1px 0 rgba(255,255,255,0.07)",
          backdropFilter: "blur(28px)",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          rows={4}
          className="w-full resize-none bg-transparent px-6 pt-5 pb-3 text-[15px] leading-7 text-white/75 placeholder-white/18 outline-none"
          style={{ caretColor: "rgba(184,173,220,0.8)" }}
        />

        <div
          className="flex items-center justify-between gap-3 px-5 pb-5 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.052)" }}
        >
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-white/28 transition hover:border-white/12 hover:text-white/50">
              <Paperclip size={11} />
              Reference
            </button>
            <button className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-white/28 transition hover:border-white/12 hover:text-white/50">
              <Layers size={11} />
              Asset
            </button>
            <button
              disabled
              className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.04] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-white/15 cursor-not-allowed"
              title="Voice coming soon"
            >
              <Mic size={11} />
              Voice
            </button>
          </div>

          <div className="flex items-center gap-2">
            {input.trim().length > 0 && (
              <span className="hidden text-[10px] text-white/20 sm:block">⌘↵ to send</span>
            )}
            <button
              onClick={handleSend}
              disabled={input.trim().length === 0}
              className="flex items-center gap-2 rounded-[13px] border border-violet-soft/28 bg-violet-deep/14 px-4 py-2 text-sm font-semibold text-violet-pale transition duration-200 hover:border-violet-soft/48 hover:bg-violet-deep/26 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Send to SOMA
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="rounded-full border border-white/[0.065] bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-white/32 transition hover:border-white/12 hover:bg-white/[0.04] hover:text-white/58"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
