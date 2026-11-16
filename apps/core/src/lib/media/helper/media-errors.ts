import { EmbeddedError } from "@/constants/errors";
import { formatBytes } from "@/utils/format-bytes";

import { BotConsole } from "#/loggers";

/**
 * Over the interaction's upload limit. With the real size when there is one file of known
 * size, otherwise says what doesn't fit (`what`, e.g. "this video").
 */
export class FileLimitExceededError extends EmbeddedError {
  constructor(
    limit: number,
    { size, what = "this" }: { size?: number; what?: string } = {}
  ) {
    super(
      size
        ? `that's ${formatBytes(size)} and this server allows ${formatBytes(limit)}. boosting the server raises it`
        : `${what} can't fit in this server's ${formatBytes(limit)} upload limit. boosting the server raises it`
    );
    this.name = "FileLimitExceededError";
  }
}

export type MediaToolFailure =
  | "unsupported"
  | "no-video"
  | "login-required"
  | "blocked"
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
  // YouTube on datacenter IPs: "Sign in to confirm you're not a bot", also mentions cookies
  if (
    text.includes("not a bot") ||
    text.includes("rate-limited") ||
    text.includes("rate limited")
  ) {
    return "blocked";
  }
  if (
    text.includes("ip address is blocked") ||
    text.includes("not available in your country") ||
    text.includes("geo restrict") ||
    text.includes("geo-restrict")
  ) {
    return "region-blocked";
  }
  // YouTube's "Private video. Sign in if you've been granted access" isn't fixable by login
  if (text.includes("private video")) return "not-found";
  if (
    text.includes("login") ||
    text.includes("sign in") ||
    text.includes("members-only") ||
    text.includes("log in") ||
    text.includes("cookies") ||
    text.includes("authentication") ||
    text.includes("private")
  ) {
    return "login-required";
  }
  if (
    text.includes("not available") ||
    text.includes("unavailable") ||
    text.includes("has been removed") ||
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
  unsupported:
    "i can't download from this link. make sure it points to a single post or clip",
  "no-video": "this post has no video",
  "login-required":
    "i can't download this post without logging in. it may be private, age-restricted or only visible to logged-in users",
  blocked: "the platform is blocking my downloads right now. try again later",
  "region-blocked": "this post isn't available in my region, or it doesn't exist",
  "not-found": "i couldn't find this post. it may have been deleted or made private",
  timeout: "the platform took too long to answer. try again later",
};

export const mediaToolError = (
  failure: MediaToolFailure,
  platform: string,
  details?: string
): EmbeddedError => {
  if (failure === "unknown") {
    // stderr of these tools carries URLs and error text, never cookies
    BotConsole.warn(`[media] ${platform} download failed:`, details?.trim().slice(-500));
    return new EmbeddedError(
      `i couldn't download from ${platform}, it sent an unexpected error. try again later`
    );
  }

  return new EmbeddedError(`${platform}: ${messages[failure]}`);
};
