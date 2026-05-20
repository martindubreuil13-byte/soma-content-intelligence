"use client";

import { ArrowRight, BookOpen, Check } from "lucide-react";
import type { ConversationExtraction } from "@/lib/intelligence/conversation-extraction";
import type { SomaInterpretedResponse } from "@/lib/intelligence/soma-response";

interface AgentResponsePreviewProps {
  text: string;
  reference?: string;
  memorySaved: boolean;
  extraction?: ConversationExtraction | null;
  response?: SomaInterpretedResponse | null;
  suggestedActions?: string[];
  onCreateMission: () => void;
  onSaveMemory: () => void;
  onClose: () => void;
}

export function AgentResponsePreview({
  text,
  reference,
  memorySaved,
  extraction,
  response,
  suggestedActions = [],
  onCreateMission,
  onSaveMemory,
  onClose,
}: AgentResponsePreviewProps) {
  const primaryIsMission = extraction?.detectedIntent === "content_mission" || !extraction;
  const headline = response?.headline ?? "I can work with this.";
  const body = response?.body ?? "Tell me what you'd like to do with it. I can start a content mission, or remember this as direction.";

  return (
    <div className="mt-8 w-full animate-fade-up">
      <div
        className="overflow-hidden rounded-[22px]"
        style={{
          border: "1px solid rgba(128,112,184,0.14)",
          background: "linear-gradient(145deg, rgba(74,56,128,0.07) 0%, rgba(255,255,255,0.022) 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="px-6 pt-5 pb-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-soft/65" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-violet-pale/40">
              SOMA interpreted this
            </span>
          </div>

          <h3 className="font-display text-[21px] leading-tight text-white/88">{headline}</h3>
          <p className="mt-2.5 text-[13px] leading-6 text-white/38">{body}</p>

          {extraction?.extractedSignals.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {extraction.extractedSignals.slice(0, 7).map((signal) => (
                <span
                  key={`${signal.kind}-${signal.value}`}
                  className="rounded-full border border-violet-soft/16 bg-violet-deep/10 px-3 py-1.5 text-[11px] font-semibold text-violet-pale/62"
                >
                  <span className="text-white/30">{signal.label}:</span> {signal.value}
                </span>
              ))}
            </div>
          ) : null}

          {reference ? (
            <p className="mt-4 rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-left text-[12px] leading-5 text-white/34">
              Reference signal noted: {reference.length > 150 ? `${reference.slice(0, 150)}...` : reference}
            </p>
          ) : null}

          {suggestedActions.length ? (
            <div className="mt-4">
              <p className="mb-2 text-left text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
                SOMA suggests
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedActions.slice(0, 3).map((action) => (
                  <span
                    key={action}
                    className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/36"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-wrap items-center gap-2 px-6 pb-5 pt-3.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {memorySaved ? (
            <div className="flex items-center gap-2 rounded-[13px] border border-emerald-300/20 bg-emerald-300/5 px-4 py-2 text-[13px] font-semibold text-emerald-200/60">
              <Check size={13} />
              {response?.memoryLine ?? "SOMA remembered this."}
            </div>
          ) : primaryIsMission ? (
            <>
              <button
                onClick={onCreateMission}
                className="flex items-center gap-2 rounded-[13px] border border-violet-soft/28 bg-violet-deep/14 px-4 py-2 text-[13px] font-semibold text-violet-pale transition hover:border-violet-soft/48 hover:bg-violet-deep/26 hover:text-white"
              >
                Create mission <ArrowRight size={12} />
              </button>
              <button
                onClick={onSaveMemory}
                className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60"
              >
                <BookOpen size={12} />
                Keep teaching SOMA
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSaveMemory}
                className="flex items-center gap-2 rounded-[13px] border border-violet-soft/28 bg-violet-deep/14 px-4 py-2 text-[13px] font-semibold text-violet-pale transition hover:border-violet-soft/48 hover:bg-violet-deep/26 hover:text-white"
              >
                <BookOpen size={12} />
                Keep teaching SOMA
              </button>
              <button
                onClick={onCreateMission}
                className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60"
              >
                Create mission <ArrowRight size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={onClose}
          className="text-[11px] text-white/18 transition hover:text-white/38"
        >
          x start over
        </button>
      </div>
    </div>
  );
}
