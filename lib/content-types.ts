export type ContentChannel = "linkedin" | "facebook" | "instagram" | "tiktok";

export type FeedbackStatus = "approved" | "rejected" | "pending";
export type FeedbackTarget = "caption" | "visualPrompt" | "image";

export type ChannelFeedback = {
  status: FeedbackStatus;
  notes: string;
  updatedAt?: string;
};

export type ChannelFeedbackGroup = Record<FeedbackTarget, ChannelFeedback>;

export type FeedbackGenerationType = "initial" | "regenerate" | "reimagine";

export type FeedbackVersion = {
  id: string;
  createdAt: string;
  generationType: FeedbackGenerationType;
  status: FeedbackStatus;
  notes: string;
  updatedAt?: string;
  tags?: string[];
  archetype?: string;
  conceptAngle?: string;
  text?: string;
  promptExcerpt?: string;
  imagePath?: string;
  captionExcerpt?: string;
  parentCaptionVersionId?: string;
  regenerationIndex?: number;
  sourceVisualPromptVersionId?: string;
};

export type ChannelFeedbackLineage = {
  captionVersions: FeedbackVersion[];
  visualPromptVersions: FeedbackVersion[];
  imageVersions: FeedbackVersion[];
};

export type ContentPackage = {
  caption: string;
  visualPrompt: string;
  feedback: ChannelFeedbackGroup;
  feedbackLineage: ChannelFeedbackLineage;
  currentCaptionVersionId?: string;
  currentVisualPromptVersionId?: string;
  currentImageVersionId?: string;
  imageUrl?: string;
  imageUpdatedAt?: number;
};

export type ContentRun = {
  id: string;
  timestamp: string;
  folderName: string;
  title: string;
  mood: string;
  originalIdea: string;
  hasOriginalIdea: boolean;
  channels: Record<ContentChannel, ContentPackage>;
};

export const channelLabels: Record<ContentChannel, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok"
};
