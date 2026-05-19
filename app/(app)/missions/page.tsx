"use client";

import { useState } from "react";
import { ArrowRight, Mic, Paperclip, Layers, Target } from "lucide-react";
import { AgentOrb } from "@/components/soma/agent-orb";
import { PremiumPanel } from "@/components/soma/premium-panel";

const MISSION_EXAMPLES = [
  "Build authority in my niche with educational content",
  "Generate leads for our upcoming product launch",
  "Promote our new offer to warm audiences on LinkedIn",
  "Create a 7-day educational sequence for Instagram",
  "Improve our visual direction — more minimal, more premium",
];

const MISSION_CATEGORIES = [
  { label: "Build authority",    description: "Position your brand as the expert",       icon: "◆" },
  { label: "Generate leads",     description: "Content that attracts and converts",       icon: "◎" },
  { label: "Promote a product",  description: "Launch or re-engage around an offer",      icon: "▲" },
  { label: "Educate audience",   description: "Teach your audience something valuable",   icon: "○" },
  { label: "Daily content",      description: "Maintain consistent presence",             icon: "◷" },
  { label: "Improve direction",  description: "Refine tone, style, and visual identity",  icon: "◈" },
];

export default function MissionsPage() {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div className="min-h-screen px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div className="flex items-start gap-5">
          <AgentOrb state="listening" size="md" className="mt-1 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
              New mission
            </p>
            <h1 className="mt-1.5 font-display text-2xl text-white sm:text-3xl">
              What should SOMA work on?
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Describe an objective. SOMA will learn what you need, use your brand memory, and begin creating.
            </p>
          </div>
        </div>

        {/* Mission input */}
        <PremiumPanel variant="elevated" noPadding>
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Tell SOMA what you want to create, improve, promote, or achieve today…"
              rows={4}
              className="w-full resize-none rounded-t-[20px] bg-transparent px-6 pt-5 pb-3 text-sm leading-7 text-white/80 placeholder-white/22 outline-none"
              style={{ caretColor: "rgba(184,173,220,0.8)" }}
            />

            <div
              className="flex items-center justify-between gap-3 rounded-b-[20px] px-4 pb-4 pt-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
            >
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-white/32 transition hover:border-white/12 hover:text-white/52">
                  <Paperclip size={12} />
                  Reference
                </button>
                <button className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-white/32 transition hover:border-white/12 hover:text-white/52">
                  <Layers size={12} />
                  Asset
                </button>
                <button className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-white/32 opacity-50 cursor-not-allowed" disabled>
                  <Mic size={12} />
                  Voice
                </button>
              </div>

              <button
                disabled={input.trim().length === 0}
                className="flex items-center gap-2 rounded-[12px] border border-violet-soft/28 bg-violet-deep/14 px-4 py-2 text-sm font-semibold text-violet-pale transition duration-200 hover:border-violet-soft/45 hover:bg-violet-deep/24 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed"
              >
                Start mission
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </PremiumPanel>

        {/* Quick mission starters */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
            Mission types
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MISSION_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setInput(cat.description + " — " + cat.label.toLowerCase())}
                className="group flex items-center gap-3.5 rounded-[16px] p-4 text-left transition duration-200"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(26, 20, 36, 0.5)",
                }}
              >
                <span className="text-lg text-white/20 group-hover:text-violet-pale/60 transition">{cat.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white/65 group-hover:text-white/90 transition">{cat.label}</p>
                  <p className="text-xs text-white/30">{cat.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Example prompts */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
            Examples
          </p>
          <div className="space-y-1.5">
            {MISSION_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="group flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm text-white/40 transition hover:bg-white/[0.04] hover:text-white/65"
              >
                <Target size={13} className="shrink-0 text-white/20 group-hover:text-violet-pale/50 transition" />
                {ex}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
