"use client";

import { useState } from "react";
import { ArrowRight, Layers, Mic, Paperclip, X } from "lucide-react";

interface AgentComposerProps {
  suggestions?: string[];
  placeholder?: string;
  onSend: (text: string, reference?: string) => void;
}

export function AgentComposer({ suggestions = [], placeholder, onSend }: AgentComposerProps) {
  const [input, setInput] = useState("");
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceText, setReferenceText] = useState("");
  const [attachedReference, setAttachedReference] = useState("");

  const effectivePlaceholder =
    placeholder ?? "Share a thought, describe what you want to create, or give SOMA direction…";

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim(), attachedReference || undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
  }

  function attachReference() {
    if (referenceText.trim()) setAttachedReference(referenceText.trim());
    setReferenceText("");
    setReferenceOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* Main composer surface */}
      <div
        className="overflow-hidden rounded-[22px]"
        style={{
          border: "1px solid rgba(255,255,255,0.09)",
          background: "linear-gradient(145deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.42), 0 0 0 1px rgba(128,112,184,0.06), inset 0 1px 0 rgba(255,255,255,0.07)",
          backdropFilter: "blur(28px)",
        }}
      >
        {/* Attached reference chip */}
        {attachedReference && (
          <div className="px-5 pt-4">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              <Paperclip size={10} className="shrink-0 text-white/35" />
              <span className="max-w-[240px] truncate text-[11px] text-white/45">
                {attachedReference.length > 60 ? attachedReference.slice(0, 60) + "…" : attachedReference}
              </span>
              <button
                onClick={() => setAttachedReference("")}
                className="ml-1 text-white/22 transition hover:text-white/55"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          rows={4}
          className="w-full resize-none bg-transparent px-6 pt-5 pb-3 text-[15px] leading-7 text-white/75 placeholder-white/18 outline-none"
          style={{ caretColor: "rgba(184,173,220,0.8)" }}
        />

        {/* Inline reference panel */}
        {referenceOpen && (
          <div
            className="mx-4 mb-4 overflow-hidden rounded-[14px]"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="px-4 pt-3 pb-2">
              <p className="mb-2 text-[11px] leading-5 text-white/35">
                Paste a link, example, or note you want SOMA to learn from.
              </p>
              <textarea
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="https://… or paste an example…"
                rows={3}
                autoFocus
                className="w-full resize-none bg-transparent text-[13px] leading-6 text-white/65 placeholder-white/18 outline-none"
                style={{ caretColor: "rgba(184,173,220,0.8)" }}
              />
            </div>
            <div
              className="flex items-center justify-end gap-2 px-4 py-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <button
                onClick={() => { setReferenceOpen(false); setReferenceText(""); }}
                className="text-[11px] text-white/25 transition hover:text-white/50"
              >
                Cancel
              </button>
              <button
                onClick={attachReference}
                disabled={!referenceText.trim()}
                className="rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/50 transition hover:border-white/14 hover:text-white/75 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Attach
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div
          className="flex items-center justify-between gap-3 px-5 pb-5 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.052)" }}
        >
          <div className="flex items-center gap-1.5">
            {/* Reference — opens inline panel */}
            <button
              onClick={() => setReferenceOpen(!referenceOpen)}
              className={`flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                referenceOpen || attachedReference
                  ? "border-violet-soft/22 bg-violet-deep/8 text-violet-pale/70 hover:text-violet-pale"
                  : "border-white/[0.07] bg-transparent text-white/28 hover:border-white/12 hover:text-white/50"
              }`}
            >
              <Paperclip size={11} />
              Reference
            </button>

            {/* Asset — navigate to asset library */}
            <a
              href="/assets"
              className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.07] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-white/28 transition hover:border-white/12 hover:text-white/50"
              title="Upload assets for SOMA to remember"
            >
              <Layers size={11} />
              Asset
            </a>

            {/* Voice — disabled with tooltip */}
            <div className="group relative">
              <button
                disabled
                className="flex cursor-not-allowed items-center gap-1.5 rounded-[10px] border border-white/[0.04] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-white/15"
              >
                <Mic size={11} />
                Voice
              </button>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[9px] border border-white/[0.07] bg-[#1A1424]/95 px-2.5 py-1.5 text-[10px] font-semibold text-white/45 opacity-0 shadow-panel backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
                Voice training coming soon
              </div>
            </div>
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
