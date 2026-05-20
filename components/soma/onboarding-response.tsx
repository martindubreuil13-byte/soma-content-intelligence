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
import {
  buildMissionBridgeNarrative,
  buildNarrativeSummary,
  buildNaturalUncertainty,
  buildNextQuestionIntro,
  buildReadinessNarrative,
} from "@/lib/onboarding/onboarding-narrative";

type MissionType = NonNullable<OnboardingState["missionBridge"]>["missionType"];
type ReferenceChoice = NonNullable<OnboardingState["missionBridge"]>["referenceChoice"];

interface OnboardingResponseProps {
  response: string;
  profile: OnboardingProfile;
  missingFields: Array<keyof OnboardingProfile>;
  nextQuestion?: OnboardingQuestion;
  confidence: OnboardingConfidence;
  readyForMission: boolean;
  needsCorrection?: boolean;
  visualReferenceCount?: number;
  onAnswer: () => void;
  onCorrect: () => void;
  onSkip: () => void;
  onConfirm: () => void;
  onStartMission: () => void;
  onMissionChoice: (choice: { missionType?: MissionType; channel?: ContentChannel | "multi"; referenceChoice?: ReferenceChoice }) => void;
}

const fieldLabels: Partial<Record<keyof OnboardingProfile, string>> = {
  businessSummary: "what you are building",
  offer: "what people can buy or use",
  audience: "who this should reach first",
  corePain: "the struggle to lead with",
  desiredOutcome: "the change you create",
  differentiator: "why this is not the obvious alternative",
  brandTone: "how this should sound",
  visualDirection: "how this should look and feel",
  preferredChannels: "where this should show up first",
  ctaPreferences: "how you want to invite action",
  whatToBeKnownFor: "what people should remember",
};

const missionOptions: Array<{ label: string; value: MissionType; needsReference?: boolean }> = [
  { label: "Write the post first", value: "caption_only" },
  { label: "Create post + visual direction", value: "caption_visual", needsReference: true },
  { label: "Explore the visual direction only", value: "visual_direction", needsReference: true },
  { label: "Give me hook variations", value: "hook_variations" },
  { label: "Shape the campaign angle first", value: "campaign_direction" },
];

const channelOptions: Array<{ label: string; value: ContentChannel | "multi" }> = [
  { label: "Start on LinkedIn", value: "linkedin" },
  { label: "Start on Instagram", value: "instagram" },
  { label: "Start on Facebook", value: "facebook" },
  { label: "Start on TikTok", value: "tiktok" },
  { label: "Adapt across channels", value: "multi" },
];

const referenceOptions: Array<{ label: string; value: ReferenceChoice }> = [
  { label: "Use what SOMA knows", value: "use_known" },
  { label: "Show SOMA a reference", value: "upload_reference" },
  { label: "Explore without reference", value: "explore_without_reference" },
];

function profileItems(profile: OnboardingProfile) {
  return [
    ["The business seems to be", profile.businessSummary],
    ["It appears to serve", profile.audience],
    ["The struggle may be", profile.corePain],
    ["The change it creates", profile.desiredOutcome],
    ["What may set it apart", profile.differentiator],
    ["The voice forming", profile.brandTone],
    ["The visual direction forming", profile.visualDirection],
    ["The first places to show up", profile.preferredChannels?.join(", ")],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);
}

export function OnboardingResponse({
  response,
  profile,
  missingFields,
  nextQuestion,
  confidence,
  readyForMission,
  needsCorrection = false,
  visualReferenceCount = 0,
  onAnswer,
  onCorrect,
  onSkip,
  onConfirm,
  onStartMission,
  onMissionChoice,
}: OnboardingResponseProps) {
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionType, setMissionType] = useState<MissionType>();
  const [channel, setChannel] = useState<ContentChannel | "multi">();
  const [needsReference, setNeedsReference] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [referencePanelOpen, setReferencePanelOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [attachedAssetName, setAttachedAssetName] = useState("");
  const understood = profileItems(profile);
  const missing = missingFields
    .map((field) => fieldLabels[field])
    .filter((label): label is string => Boolean(label))
    .slice(0, 4);
  const narrative = readyForMission
    ? buildReadinessNarrative(profile, confidence)
    : [
        response || buildNarrativeSummary(profile, confidence),
        buildNaturalUncertainty(profile, missingFields, needsCorrection),
        buildNextQuestionIntro(nextQuestion),
      ].filter(Boolean).join("\n\n");
  const missionNarrative = buildMissionBridgeNarrative(
    profile,
    { missionType, channel },
    visualReferenceCount,
    attachedAssetName
  );

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
    if (value === "upload_reference") {
      setReferencePanelOpen(true);
      setUploadError("");
    }
    if (value === "use_known" && visualReferenceCount === 0) {
      setUploadError("I don’t have visual memory yet. I can still explore, or you can show me a reference.");
    }
    onMissionChoice({ missionType, channel, referenceChoice: value });
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadMessage("");

    const formData = new FormData();
    formData.set("file", file);
    formData.set("asset_type", "visual_reference");
    formData.set("name", file.name || "Visual reference");
    formData.set("description", "Reference shown to SOMA during first mission setup.");
    formData.set("tags", "soma,onboarding,visual-reference");

    try {
      const response = await fetch("/api/assets", { method: "POST", body: formData });
      const json = await response.json().catch(() => null) as { ok?: boolean; data?: { asset?: { name?: string } } } | null;

      if (!response.ok || !json?.ok) {
        setUploadError("I couldn’t add that reference. Try a PNG, JPEG, WebP, PDF, or text file under 10MB.");
        return;
      }

      const assetName = json.data?.asset?.name ?? file.name;
      setAttachedAssetName(assetName);
      setUploadMessage("SOMA added this as a visual reference.");
      onMissionChoice({ missionType, channel, referenceChoice: "upload_reference" });
    } catch {
      setUploadError("I couldn’t add that reference. Try again in a moment.");
    } finally {
      setUploading(false);
    }
  }

  function createFirstDraft() {
    const prompt = [
      `Mission: ${missionOptions.find((option) => option.value === missionType)?.label ?? "First direction"}`,
      `Channel: ${channel === "multi" ? "Multi-channel" : channel ?? "First useful channel"}`,
      attachedAssetName ? `Visual reference: ${attachedAssetName}` : "",
      profile.businessSummary ? `Context: ${profile.businessSummary}` : "",
    ].filter(Boolean).join("\n");
    sessionStorage.setItem("soma_mission_prompt", prompt);
    window.location.href = `/missions?prompt=${encodeURIComponent(prompt.slice(0, 200))}`;
  }

  return (
    <div className="mt-10 w-full animate-fade-up text-left">
      <div
        className="overflow-hidden rounded-[24px]"
        style={{
          border: "1px solid rgba(128,112,184,0.14)",
          background: "linear-gradient(145deg, rgba(74,56,128,0.07) 0%, rgba(255,255,255,0.022) 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="px-6 pt-6 pb-6 sm:px-8 sm:pt-7">
          <p className="whitespace-pre-line font-display text-[23px] leading-[1.55] text-white/88 sm:text-[25px]">
            {narrative}
          </p>

          {understood.length ? (
            <div className="mt-6">
              <button
                onClick={() => setDetailsOpen((value) => !value)}
                className="text-[11px] font-semibold text-violet-pale/45 transition hover:text-violet-pale"
              >
                {detailsOpen ? "Hide what SOMA has captured" : "Show what SOMA has captured"}
              </button>
              {detailsOpen ? (
                <div className="mt-4 space-y-1.5 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                  {understood.slice(0, 7).map(([label, value]) => (
                    <p key={label} className="text-[12px] leading-5 text-white/38">
                      <span className="text-violet-pale/55">{label}:</span> {value}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {missing.length && !readyForMission && detailsOpen ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {missing.map((label) => (
                <span key={label} className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/34">
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-5 text-[12px] leading-5 text-white/25">{confidence.wording}</p>
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
                Correct SOMA
              </button>
              <button onClick={onSkip} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                Skip for now
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
                Correct SOMA
              </button>
              <button onClick={onAnswer} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                Teach SOMA more
              </button>
              <button onClick={() => {
                setMissionOpen(true);
                chooseReference("upload_reference");
              }} className="flex items-center gap-2 rounded-[13px] border border-white/[0.07] bg-transparent px-4 py-2 text-[13px] font-semibold text-white/35 transition hover:border-white/12 hover:text-white/60">
                <Upload size={12} />
                Add visual reference
              </button>
            </>
          )}
        </div>

        {missionOpen ? (
          <div className="space-y-5 px-6 pb-7 pt-2 sm:px-8">
            <div>
              <p className="mb-2 text-[13px] leading-5 text-white/45">
                Good. Let&apos;s decide the first move. Should I write first, explore a visual direction, or shape the campaign angle?
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
                <p className="mb-2 text-[13px] leading-5 text-white/45">
                  Where should this live first?
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
                  Do you want to ground this in something you already have, or should I explore freely?
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
                {uploadError && !referencePanelOpen ? (
                  <p className="mt-3 text-[12px] leading-5 text-soma-pearl/58">{uploadError}</p>
                ) : null}
              </div>
            ) : null}

            {missionType && channel ? (
              <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                <p className="text-[13px] leading-6 text-white/42">
                  {missionNarrative}
                </p>
                {attachedAssetName ? (
                  <span className="mt-3 inline-flex rounded-full border border-emerald-300/18 bg-emerald-300/6 px-3 py-1.5 text-[11px] font-semibold text-emerald-200/65">
                    {attachedAssetName}
                  </span>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={createFirstDraft}
                    className="rounded-full border border-violet-soft/32 bg-violet-deep/16 px-3 py-1.5 text-[11px] font-semibold text-violet-pale transition hover:border-violet-soft/50 hover:text-white"
                  >
                    Create first draft
                  </button>
                  <button
                    onClick={() => setReferencePanelOpen(true)}
                    className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] font-semibold text-white/38 transition hover:text-white/60"
                  >
                    Show SOMA a reference
                  </button>
                  <button
                    onClick={() => setMissionType(undefined)}
                    className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] font-semibold text-white/38 transition hover:text-white/60"
                  >
                    Adjust direction
                  </button>
                </div>
              </div>
            ) : null}

            {referencePanelOpen ? (
              <div className="rounded-[16px] border border-violet-soft/14 bg-violet-deep/8 px-4 py-3">
                <p className="mb-2 text-[13px] font-semibold text-violet-pale/70">Show SOMA a reference</p>
                <p className="mb-3 text-[12px] leading-5 text-white/35">
                  Add a logo, screenshot, previous post, or visual inspiration. I’ll use it as visual memory for this first direction.
                </p>
                <label className="inline-flex cursor-pointer rounded-full border border-violet-soft/28 bg-violet-deep/14 px-3 py-1.5 text-[11px] font-semibold text-violet-pale transition hover:text-white">
                  {uploading ? "Adding reference..." : "Teach visually"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                    disabled={uploading}
                    onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
                  />
                </label>
                {uploadMessage ? <p className="mt-3 text-[12px] text-emerald-200/60">{uploadMessage}</p> : null}
                {uploadError ? <p className="mt-3 text-[12px] leading-5 text-soma-pearl/58">{uploadError}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
