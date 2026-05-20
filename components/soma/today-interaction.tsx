"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AgentComposer } from "@/components/soma/agent-composer";
import { AgentResponsePreview } from "@/components/soma/agent-response-preview";
import { AgentOrb } from "@/components/soma/agent-orb";
import { OnboardingResponse } from "@/components/soma/onboarding-response";
import { safeJsonFetch } from "@/lib/client/fetch-safe";
import type { OrbState } from "@/components/soma/agent-orb";
import type { ConversationExtraction } from "@/lib/intelligence/conversation-extraction";
import type { SomaInterpretedResponse } from "@/lib/intelligence/soma-response";
import type {
  OnboardingAnalysisResult,
  OnboardingMode,
  OnboardingState,
} from "@/lib/onboarding/onboarding-types";

type Phase = "idle" | "composing" | "thinking" | "responded";

interface TodayInteractionProps {
  // Server-computed presence
  headline: string;
  body: string;
  initialOrbState: OrbState;
  maturityLevel: number;
  // Interaction
  primaryLabel: string;
  suggestions?: string[];
  placeholder?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  isFirstContact?: boolean;
}

export function TodayInteraction({
  headline,
  body,
  initialOrbState,
  maturityLevel,
  primaryLabel,
  suggestions = [],
  placeholder,
  secondaryLabel,
  secondaryHref,
  isFirstContact = false,
}: TodayInteractionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [submittedText, setSubmittedText] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | undefined>();
  const [memorySaved, setMemorySaved] = useState(false);
  const [extraction, setExtraction] = useState<ConversationExtraction | null>(null);
  const [somaResponse, setSomaResponse] = useState<SomaInterpretedResponse | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [onboardingResult, setOnboardingResult] = useState<OnboardingAnalysisResult | null>(null);
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>("answer");
  const router = useRouter();

  const orbState: OrbState =
    phase === "composing"  ? "listening"
    : phase === "thinking" ? "thinking"
    : phase === "responded" ? "learning"
    : initialOrbState;

  async function handleSend(text: string, reference?: string) {
    setSubmittedText(text);
    setSubmittedRef(reference);
    setExtraction(null);
    setSomaResponse(null);
    setSuggestedActions([]);
    setOnboardingResult(null);
    setErrorMessage("");
    setMemorySaved(false);
    setPhase("thinking");

    if (isFirstContact) {
      const onboarding = await safeJsonFetch<OnboardingAnalysisResult>("/api/soma/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, state: onboardingState, mode: onboardingMode }),
      });

      if (onboarding.ok) {
        setOnboardingState(onboarding.data.state);
        setOnboardingResult(onboarding.data);
        setOnboardingMode("answer");
        setMemorySaved(true);
      } else {
        setErrorMessage(onboarding.error.message);
      }
      setPhase("responded");
      return;
    }

    const result = await safeJsonFetch<{
      extraction: ConversationExtraction;
      response: SomaInterpretedResponse;
      remembered: boolean;
    }>("/api/soma/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, reference }),
    });

    if (result.ok) {
      setExtraction(result.data.extraction);
      setSomaResponse(result.data.response);
      setSuggestedActions(result.data.extraction.suggestedActions);
      setMemorySaved(result.data.remembered);
    } else {
      setErrorMessage(result.error.message);
      setSomaResponse({
        headline: "I couldn't interpret that cleanly.",
        body: "The thought is still here. Try sending it again, or say it in a simpler way and I’ll listen.",
        memoryLine: "Nothing was added to memory.",
      });
    }
    setPhase("responded");
  }

  function handleCreateMission() {
    if (submittedText) {
      sessionStorage.setItem("soma_mission_prompt", submittedText);
    }
    router.push(`/missions?prompt=${encodeURIComponent(submittedText.slice(0, 200))}`);
  }

  function handleSaveMemory() {
    setMemorySaved(true);
  }

  async function handleOnboardingAction(action: "confirm_understanding" | "start_mission") {
    const message = action === "confirm_understanding"
      ? "Confirm this understanding."
      : "Start the first mission.";
    setErrorMessage("");

    const result = await safeJsonFetch<OnboardingAnalysisResult>("/api/soma/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, state: onboardingState, action }),
    });

    if (result.ok) {
      setOnboardingState(result.data.state);
      setOnboardingResult(result.data);
      setOnboardingMode("answer");
      setMemorySaved(true);
    } else {
      setErrorMessage(result.error.message);
    }
  }

  async function handleOnboardingSkip() {
    setErrorMessage("");
    setPhase("thinking");

    const result = await safeJsonFetch<OnboardingAnalysisResult>("/api/soma/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Skip for now.", state: onboardingState, mode: "skip" }),
    });

    if (result.ok) {
      setOnboardingState(result.data.state);
      setOnboardingResult(result.data);
      setOnboardingMode("answer");
      setMemorySaved(true);
    } else {
      setErrorMessage(result.error.message);
    }
    setPhase("responded");
  }

  function openOnboardingComposer(mode: OnboardingMode) {
    setOnboardingMode(mode);
    setPhase("composing");
  }

  function handleMissionChoice(choice: NonNullable<OnboardingState["missionBridge"]>) {
    const nextState: OnboardingState | null = onboardingState
      ? {
          ...onboardingState,
          missionBridge: {
            ...onboardingState.missionBridge,
            ...choice,
          },
        }
      : null;

    if (nextState) setOnboardingState(nextState);
    sessionStorage.setItem("soma_onboarding_mission", JSON.stringify({
      ...onboardingState?.missionBridge,
      ...choice,
      profile: onboardingState?.profile,
    }));
  }

  function handleReset() {
    setPhase("idle");
    setSubmittedText("");
    setSubmittedRef(undefined);
    setMemorySaved(false);
    setExtraction(null);
    setSomaResponse(null);
    setOnboardingResult(null);
    setOnboardingMode("answer");
    setSuggestedActions([]);
    setErrorMessage("");
  }

  const showBody = phase === "idle" || phase === "composing";
  const onboardingPlaceholder =
    onboardingMode === "correction"
      ? "Correct my understanding in your own words."
      : onboardingResult?.nextQuestion?.question ?? placeholder;
  const onboardingSuggestions =
    onboardingMode === "correction"
      ? [
          "Correction: here is what SOMA misunderstood",
          "Not quite. The more accurate version is",
          "Treat this as the stronger signal",
        ]
      : suggestions;

  return (
    <div className="flex flex-col items-center text-center">

      {/* Orb — reactive to interaction state */}
      <AgentOrb state={orbState} size="xl" maturityLevel={maturityLevel} />

      {/* SOMA's voice — always present */}
      <h1 className="mt-9 font-display text-4xl text-white/90 sm:text-5xl">
        {headline}
      </h1>

      {/* Body copy — visible during idle and composing only */}
      {showBody && (
        <p className="mx-auto mt-5 max-w-[400px] text-[15px] leading-7 text-white/40">
          {body}
        </p>
      )}

      {/* ── Interaction states ───────────────────────────────────────────── */}

      {phase === "idle" && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            onClick={() => setPhase("composing")}
            className="group flex items-center gap-3 rounded-[18px] border border-violet-soft/25 bg-violet-deep/12 px-7 py-3.5 text-sm font-semibold text-violet-pale transition duration-200 hover:border-violet-soft/42 hover:bg-violet-deep/20 hover:text-white"
          >
            {primaryLabel}
            <ArrowRight size={15} className="transition duration-200 group-hover:translate-x-0.5" />
          </button>

          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-[13px] text-white/30 transition hover:text-white/52"
            >
              {secondaryLabel} <span className="text-white/18">→</span>
            </Link>
          )}
        </div>
      )}

      {phase === "composing" && (
        <div className="mt-10 w-full animate-fade-up">
          <AgentComposer
            suggestions={onboardingSuggestions}
            placeholder={onboardingPlaceholder}
            onSend={handleSend}
          />
          <div className="mt-4 flex items-center justify-center gap-4">
            {secondaryLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="text-[12px] text-white/28 transition hover:text-white/50"
              >
                {secondaryLabel} →
              </Link>
            )}
            <button
              onClick={handleReset}
              className="text-[11px] text-white/18 transition hover:text-white/35"
            >
              × close
            </button>
          </div>
        </div>
      )}

      {phase === "thinking" && (
        <div className="mt-12 flex items-center gap-2.5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1 w-1 rounded-full bg-violet-soft/45"
                style={{ animation: `orb-pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/22">
            SOMA is thinking
          </span>
        </div>
      )}

      {phase === "responded" && (
        <>
          {errorMessage ? (
            <p className="mt-5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-[12px] text-white/38">
              {errorMessage}
            </p>
          ) : null}
          {isFirstContact && onboardingResult ? (
            <OnboardingResponse
              response={onboardingResult.response}
              profile={onboardingResult.profile}
              missingFields={onboardingResult.missingFields}
              nextQuestion={onboardingResult.nextQuestion}
              confidence={onboardingResult.confidence}
              readyForMission={onboardingResult.readyForMission}
              onAnswer={() => openOnboardingComposer("answer")}
              onCorrect={() => openOnboardingComposer("correction")}
              onSkip={handleOnboardingSkip}
              onConfirm={() => handleOnboardingAction("confirm_understanding")}
              onStartMission={() => handleOnboardingAction("start_mission")}
              onMissionChoice={handleMissionChoice}
            />
          ) : (
            <AgentResponsePreview
              text={submittedText}
              reference={submittedRef}
              memorySaved={memorySaved}
              extraction={extraction}
              response={somaResponse}
              suggestedActions={suggestedActions}
              onCreateMission={handleCreateMission}
              onSaveMemory={handleSaveMemory}
              onClose={handleReset}
            />
          )}
        </>
      )}
    </div>
  );
}
