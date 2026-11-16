import { EmbeddedError } from "@/constants/errors";

import { BotConsole } from "#/loggers";

export class FileLimitExceededError extends EmbeddedError {
  constructor() {
    super(
      "File limit exceeded. Boost your server using Nitro Boosting to increase the file limit."
    );
    this.name = "FileLimitExceededError";
  }
}

export type MediaToolFailure =
  | "unsupported"
  | "no-video"
  | "login-required"
  | "region-blocked"
  | "not-found"
  | "timeout"
  | "unknown";

/** Classifies yt-dlp / gallery-dl stderr (or gallery-dl's JSON error message). */
export const classifyToolError = (output: string): MediaToolFailure => {
  const text = output.toLowerCase();

  if (text.includes("unsupported url") || text.includes("no suitable extractor")) {
    return "unsupported";
  }
  if (text.includes("there is no video in this post")) return "no-video";
  if (
    text.includes("ip address is blocked") ||
    text.includes("not available in your country") ||
    text.includes("geo restrict") ||
    text.includes("geo-restrict")
  ) {
    return "region-blocked";
  }
  if (
    text.includes("login") ||
    text.includes("log in") ||
    text.includes("cookies") ||
    text.includes("authentication") ||
    text.includes("private")
  ) {
    return "login-required";
  }
  if (
    text.includes("not available") ||
    text.includes("no longer available") ||
    text.includes("not found") ||
    text.includes("404") ||
    text.includes("does not exist") ||
    text.includes("deleted")
  ) {
    return "not-found";
  }

  return "unknown";
};

const messages: Record<Exclude<MediaToolFailure, "unknown">, string> = {
  unsupported: "This link isn't supported. Make sure it points to a single post or clip.",
  "no-video": "This post has no video.",
  "login-required":
    "This post can't be downloaded without logging in (private, age-restricted or login-walled).",
  "region-blocked":
    "This post isn't available from the bot's region (TikTok also says this for posts that don't exist).",
  "not-found": "Post not found. It may have been deleted or made private.",
  timeout: "The platform took too long to respond. Try again later.",
};

export const mediaToolError = (
  failure: MediaToolFailure,
  platform: string,
  details?: string
): EmbeddedError => {
  if (failure === "unknown") {
    // stderr of these tools carries URLs and error text, never cookies
    BotConsole.warn(`[media] ${platform} download failed:`, details?.trim().slice(-500));
    return new EmbeddedError({
      title: `Couldn't fetch ${platform} media`,
      keepTitle: true,
      description: "The platform returned an unexpected error. Try again later.",
    });
  }

  return new EmbeddedError({
    title: `${platform}`,
    description: messages[failure],
    keepTitle: true,
  });
};
