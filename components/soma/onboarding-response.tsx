"use client";

import { useState } from "react";
import { ArrowRight, Check, Edit3, MessageCircle, Upload } from "lucide-react";
import type { ContentChannel } from "@/lib/content-types";
import type {
  OnboardingConfidence,
  OnboardingProfile,
  OnboardingQuestion,
  OnboardingState,
} from "@/lib/onboarding/onboarding-types";

type MissionType = NonNullable<OnboardingState["missionBridge"]>["missionType"];
type ReferenceChoice = NonNullable<OnboardingState["missionBridge"]>["referenceChoice"];

interface OnboardingResponseProps {
  response: string;
  profile: OnboardingProfile;
  missingFields: Array<keyof OnboardingProfile>;
  nextQuestion?: OnboardingQuestion;
  confidence: OnboardingConfidence;
  readyForMission: boolean;
  onAnswer: () => void;
  onCorrect: () => void;
  onConfirm: () => void;
  onStartMission: () => void;
  onMissionChoice: (choice: { missionType?: MissionType; channel?: ContentChannel | "multi"; referenceChoice?: ReferenceChoice }) => void;
}

const fieldLabels: Partial<Record<keyof OnboardingProfile, string>> = {
  businessSummary: "business shape",
  offer: "offer",
  audience: "audience",
  corePain: "pain",
  desiredOutcome: "promise",
  differentiator: "difference",
  brandTone: "tone",
  visualDirection: "visual direction",
  preferredChannels: "channels",
  ctaPreferences: "CTA style",
  whatToBeKnownFor: "memory anchor",
};

const missionOptions: Array<{ label: string; value: MissionType; needsReference?: boolean }> = [
  { label: "Caption only", value: "caption_only" },
  { label: "Caption + visual", value: "caption_visual", needsReference: true },
  { label: "Visual direction only", value: "visual_direction", needsReference: true },
  { label: "Hook variations", value: "hook_variations" },
  { label: "Campaign direction", value: "campaign_direction" },
];

const channelOptions: Array<{ label: string; value: ContentChannel | "multi" }> = [
  { label: "LinkedIn", value: "linkedin" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "TikTok", value: "tiktok" },
  { label: "Multi-channel", value: "multi" },
];

const referenceOptions: Array<{ label: string; value: ReferenceChoice }> = [
  { label: "Use what SOMA knows", value: "use_known" },
  { label: "Upload reference", value: "upload_reference" },
  { label: "Explore without reference", value: "explore_without_reference" },
];

function profileItems(profile: OnboardingProfile) {
  return [
    ["Business", profile.businessSummary],
    ["Audience", profile.audience],
    ["Pain", profile.corePain],
    ["Promise", profile.desiredOutcome],
    ["Difference", profile.differentiator],
    ["Tone", profile.brandTone],
    ["Visual", profile.visualDirection],
    ["Channels", profile.preferredChannels?.join(", ")],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);
}

export function OnboardingResponse({
  response,
  profile,
  missingFields,
  nextQuestion,
  confidence,
  readyForMission,
  onAnswer,
  onCorrect,
  onConfirm,
  onStartMission,
  onMissionChoice,
}: OnboardingResponseProps) {
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionType, setMissionType] = useState<MissionType>();
  const [channel, setChannel] = useState<ContentChannel | "multi">();
  const [needsReference, setNeedsReference] = useState(false);
  const understood = profileItems(profile);
  const missing = missingFields
    .map((field) => fieldLabels[field])
    .filter((label): label is string => Boolean(label))
    .slice(0, 4);

  function chooseMission(option: { value: MissionType; needsReference?: boolean }) {
    setMissionType(option.value);
    setNeedsReference(Boolean(option.needsReference));
    onMissionChoice({ missionType: option.value });
  }

  function chooseChannel(value: ContentChannel | "multi") {
    setChannel(value);
    onMissionChoice({ missionType, channel: value });
  }

  function chooseReference(value: ReferenceChoice) {
    onMissionChoice({ missionType, channel, referenceChoice: value });
  }

  return (
    <div className="mt-8 w-full animate-fade-up text-left">
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
              Strategic onboarding
            </span>
          </div>

          <p className="whitespace-pre-line font-display text-[21px] leading-snug text-white/88">{response}</p>

          {understood.length ? (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
                What I understand so far
              </p>
              <div className="space-y-1.5">
                {understood.slice(0, 6).map(([label, value]) => (
                  <p key={label} className="text-[12px] leading-5 text-white/38">
                    <span className="text-violet-pale/55">{label}:</span> {value}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {missing.length && !readyForMission ? (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
                Still missing
              </p>
              <div className="flex flex-wrap gap-2">
                {missing.map((label) => (
                  <span key={label} className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/34">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {nextQuestion && !readyForMission ? (
            <p className="mt-5 rounded-[16px] border border-violet-soft/14 bg-violet-deep/8 px-4 py-3 text-[13px] leading-6 text-violet-pale/72">
              {nextQuestion.question}
            </p>
          ) : null}

          <p className="mt-4 text-[11px] leading-5 text-white/25">{confidence.wording}</p>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 px-6 pb-5 pt-3.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {!readyForMission ? (
            <>
              <button onClick={onAnswer} className="flex items-center gap-2 rounded-[13px] border border-violet-soft/28 bg-violet-deep/14 px-4 py-2 text-[13px] font-semibold text-violet-pale transition hover:border-violet-soft/48 hover:bg-violet-deep/26 hover:text-white">
                <MessageCircle size={12} />
                Answer this
              </button>
              <button onClick={onCorrect} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                <Edit3 size={12} />
                Correct this
              </button>
              <button onClick={onConfirm} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                <Check size={12} />
                Confirm understanding
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMissionOpen(true);
                  onStartMission();
                }}
                className="flex items-center gap-2 rounded-[13px] border border-violet-soft/28 bg-violet-deep/14 px-4 py-2 text-[13px] font-semibold text-violet-pale transition hover:border-violet-soft/48 hover:bg-violet-deep/26 hover:text-white"
              >
                Start first mission <ArrowRight size={12} />
              </button>
              <button onClick={onCorrect} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                Adjust this
              </button>
              <button onClick={onAnswer} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                Teach SOMA more
              </button>
              <button onClick={() => chooseReference("upload_reference")} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                <Upload size={12} />
                Add visual reference
              </button>
            </>
          )}
        </div>

        {missionOpen ? (
          <div className="space-y-4 px-6 pb-6 pt-1">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
                Mission shape
              </p>
              <div className="flex flex-wrap gap-2">
                {missionOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => chooseMission(option)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                      missionType === option.value
                        ? "border-violet-soft/45 bg-violet-deep/20 text-white"
                        : "border-white/[0.07] bg-white/[0.025] text-white/38 hover:text-white/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {missionType ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/22">
                  Which channel should I work on first?
                </p>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => chooseChannel(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                        channel === option.value
                          ? "border-violet-soft/45 bg-violet-deep/20 text-white"
                          : "border-white/[0.07] bg-white/[0.025] text-white/38 hover:text-white/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {missionType && channel && needsReference ? (
              <div>
                <p className="mb-2 text-[13px] leading-5 text-white/38">
                  Do you want to show me a logo, screenshot, previous post, or visual reference before I create this?
                </p>
                <div className="flex flex-wrap gap-2">
                  {referenceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => chooseReference(option.value)}
                      className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] font-semibold text-white/38 transition hover:text-white/60"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
