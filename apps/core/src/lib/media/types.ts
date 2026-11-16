export interface MediaOutput {
  type: "mp4" | "png" | "jpg";
  source: Buffer | string;
  size?: number;
}

export interface PlatformResult {
  /** The post's caption or title as plain text; escaped when rendered. */
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
  /** Shows a progress step under the "Fetching …" state. */
  progress: (text: string) => Promise<void>;
  /** Per-attachment upload limit of the interaction (`interaction.attachmentSizeLimit`). */
  fileLimit: number;
  /** Aborted when the /media job times out; kills running tools. */
  signal: AbortSignal;
}

export type PlatformHandlerCallback = (
  url: string,
  context: PlatformContext
) => Promise<PlatformResult>;
