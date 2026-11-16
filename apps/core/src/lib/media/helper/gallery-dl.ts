import * as z from "zod";

import { classifyToolError, type MediaToolFailure, mediaToolError } from "./media-errors";
import { runCommand } from "./run-command";

const EXTRACT_TIMEOUT_MS = 60_000;

// gallery-dl -j prints a list of messages: [2, post] / [3, fileUrl, file] / [-1, error]
const MESSAGE_POST = 2;
const MESSAGE_FILE = 3;
const MESSAGE_ERROR = -1;

const messageSchema = z.array(z.unknown()).min(2);

const fileSchema = z.object({
  extension: z.string(),
  type: z.string().nullish(),
});

const errorSchema = z.object({
  error: z.string().nullish(),
  message: z.string().nullish(),
});

export interface GalleryFile {
  url: string;
  extension: string;
  /** TikTok sets `image` / `audio`; other extractors only give the extension. */
  type?: string;
}

export interface GalleryResult {
  /** The post's metadata object as gallery-dl reports it; read with a platform schema. */
  post: unknown;
  files: GalleryFile[];
}

export class GalleryDlError extends Error {
  constructor(
    public readonly failure: MediaToolFailure,
    public readonly details: string
  ) {
    super(`gallery-dl failed: ${failure}`);
    this.name = "GalleryDlError";
  }

  toEmbedded(platform: string) {
    return mediaToolError(this.failure, platform, this.details);
  }
}

export const fetchGallery = async (
  url: string,
  { cookies, signal }: { cookies?: string; signal?: AbortSignal }
): Promise<GalleryResult> => {
  const result = await runCommand(
    [
      "gallery-dl",
      "--config-ignore",
      "--http-timeout",
      "20",
      ...(cookies ? ["--cookies", cookies] : []),
      "-j",
      "--",
      url,
    ],
    { timeoutMs: EXTRACT_TIMEOUT_MS, signal }
  );

  if (result.timedOut) throw new GalleryDlError("timeout", result.stderr);
  // Exit code 0 even on extraction errors; those come as [-1, {...}] or on stderr
  if (result.exitCode !== 0) {
    throw new GalleryDlError(classifyToolError(result.stderr), result.stderr);
  }

  let json: unknown;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new GalleryDlError("unknown", "gallery-dl printed invalid JSON");
  }

  const messages = z.array(z.unknown()).safeParse(json);
  if (!messages.success) throw new GalleryDlError("unknown", messages.error.message);

  let post: unknown;
  const files: GalleryFile[] = [];
  const errors: string[] = [];

  for (const item of messages.data) {
    const message = messageSchema.safeParse(item);
    if (!message.success) continue;
    const [kind, ...rest] = message.data;

    if (kind === MESSAGE_POST && post === undefined) {
      post = rest[0];
    } else if (kind === MESSAGE_FILE && typeof rest[0] === "string") {
      const file = fileSchema.safeParse(rest[1]);
      if (!file.success) continue;
      files.push({
        url: rest[0],
        extension: file.data.extension.toLowerCase(),
        type: file.data.type ?? undefined,
      });
    } else if (kind === MESSAGE_ERROR) {
      const error = errorSchema.safeParse(rest[0]);
      if (error.success) errors.push(`${error.data.error}: ${error.data.message}`);
    }
  }

  if (files.length === 0) {
    const details = [...errors, result.stderr].join("\n");
    throw new GalleryDlError(classifyToolError(details), details);
  }

  return { post, files };
};
