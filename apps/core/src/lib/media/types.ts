import type { FeedbackManager } from "@/utils/managers/feedback-manager";

export interface MediaOutput {
  type: "mp4" | "png" | "jpg";
  source: Buffer | string;
  size?: number;
}

export interface PlatformResult {
  description?: string;
  media: MediaOutput[];
  metadata?: {
    author?: string;
    date?: Date;
    likes?: number;
    views?: number;
  };
}

export interface PlatformContext {
  feedback: FeedbackManager;
  /** Per-attachment upload limit of the interaction (`interaction.attachmentSizeLimit`). */
  fileLimit: number;
}

export type PlatformHandlerCallback = (
  url: string,
  context: PlatformContext
) => Promise<PlatformResult>;
