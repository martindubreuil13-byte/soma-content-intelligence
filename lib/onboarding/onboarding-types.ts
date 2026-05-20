import type { ContentChannel } from "@/lib/content-types";

export type OnboardingStatus =
  | "first_contact"
  | "gathering_context"
  | "clarifying"
  | "confirming_profile"
  | "ready_for_mission";

export type OnboardingConfidence = {
  score: number;
  label: "early" | "forming" | "clear" | "ready";
  wording: string;
};

export type OnboardingQuestion = {
  id: string;
  field: keyof OnboardingProfile | "mission";
  question: string;
  rationale?: string;
};

export type OnboardingMode = "answer" | "correction" | "skip";

export type OnboardingFieldStatus = "inferred" | "corrected" | "confirmed" | "skipped";

export type MissionReadiness = {
  ready: boolean;
  score: number;
  missing: Array<keyof OnboardingProfile>;
};

export type OnboardingProfile = {
  businessName?: string;
  businessSummary?: string;
  offer?: string;
  audience?: string;
  audienceSegments?: string[];
  corePain?: string;
  desiredOutcome?: string;
  differentiator?: string;
  brandTone?: string;
  visualDirection?: string;
  preferredChannels?: ContentChannel[];
  ctaPreferences?: string;
  whatToBeKnownFor?: string;
  missionReadiness?: MissionReadiness;
};

export type OnboardingTurn = {
  id: string;
  mode?: OnboardingMode;
  userMessage: string;
  somaResponse: string;
  extracted: Partial<OnboardingProfile>;
  missingFields: Array<keyof OnboardingProfile>;
  nextQuestion?: OnboardingQuestion;
  confidence: OnboardingConfidence;
  createdAt: string;
};

export type OnboardingState = {
  status: OnboardingStatus;
  profile: OnboardingProfile;
  turns: OnboardingTurn[];
  lastQuestion?: OnboardingQuestion;
  skippedFields?: Array<keyof OnboardingProfile>;
  fieldStatus?: Partial<Record<keyof OnboardingProfile, OnboardingFieldStatus>>;
  confirmedAt?: string;
  missionBridge?: {
    missionType?: "caption_only" | "caption_visual" | "visual_direction" | "hook_variations" | "campaign_direction";
    channel?: ContentChannel | "multi";
    referenceChoice?: "use_known" | "upload_reference" | "explore_without_reference";
  };
};

export type OnboardingAnalysisInput = {
  message: string;
  state?: OnboardingState;
  mode?: OnboardingMode;
  action?: "message" | "confirm_understanding" | "start_mission" | "select_mission_type" | "select_channel" | "select_reference";
  missionType?: OnboardingState["missionBridge"] extends infer Bridge
    ? Bridge extends { missionType?: infer MissionType }
      ? MissionType
      : never
    : never;
  channel?: ContentChannel | "multi";
  referenceChoice?: "use_known" | "upload_reference" | "explore_without_reference";
};

export type OnboardingAnalysisResult = {
  state: OnboardingState;
  response: string;
  profile: OnboardingProfile;
  extracted: Partial<OnboardingProfile>;
  missingFields: Array<keyof OnboardingProfile>;
  nextQuestion?: OnboardingQuestion;
  confidence: OnboardingConfidence;
  readyForMission: boolean;
  needsCorrection?: boolean;
  suggestedActions: string[];
};
