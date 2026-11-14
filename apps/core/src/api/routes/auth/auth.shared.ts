import { env } from "@/env";

/** Codes sent to the frontend as `?error=` when the OAuth callback fails. */
export const AUTH_CALLBACK_ERRORS = {
  /** The user cancelled on Discord's consent screen. */
  ACCESS_DENIED: "ACCESS_DENIED",
  /** Missing, expired or mismatched `state` (stale tab, cookie gone, forged request). */
  INVALID_OAUTH_STATE: "INVALID_OAUTH_STATE",
  /** Too many auth requests from this IP. */
  RATE_LIMITED: "RATE_LIMITED",
  /** Anything else: other Discord errors, missing code, token exchange or DB failure. */
  AUTH_CALLBACK_ERROR: "AUTH_CALLBACK_ERROR",
} as const;

export type AuthCallbackError = keyof typeof AUTH_CALLBACK_ERRORS;

export const DEFAULT_RETURN_PATH = "/panel";

const MAX_RETURN_PATH_LENGTH = 512;
// Printable ASCII without space and backslash: no control chars, no `\` host tricks
const RETURN_PATH_CHARS = /^[\x21-\x5b\x5d-\x7e]+$/;
const RETURN_PATH_PREFIX = /^\/panel(?:[/?]|$)/;
const PARSE_BASE = "http://return-path.invalid";

/**
 * Returns `value` when it is a safe relative panel path (`/panel`, `/panel/…`,
 * `/panel?…`), otherwise `undefined`.
 */
export const sanitizeReturnPath = (value: unknown): string | undefined => {
  if (
    typeof value !== "string" ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !RETURN_PATH_CHARS.test(value) ||
    !RETURN_PATH_PREFIX.test(value)
  ) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return undefined;
  }

  // Anything the URL parser rewrites (dot segments, encoded dots) is rejected, so the
  // browser gets exactly the path that was validated
  if (
    url.origin !== PARSE_BASE ||
    url.pathname.includes("//") ||
    `${url.pathname}${url.search}${url.hash}` !== value
  ) {
    return undefined;
  }

  return value;
};

const frontendBase = env.FRONTEND_URL.replace(/\/+$/, "");

/** Absolute frontend URL for a sanitized return path, with `error` set or removed. */
export const frontendUrl = (returnPath: string, error?: AuthCallbackError) => {
  const url = new URL(returnPath, PARSE_BASE);

  if (error) url.searchParams.set("error", error);
  // A retry passes the previous error back in the return path
  else if (!url.searchParams.has("error")) return `${frontendBase}${returnPath}`;
  else url.searchParams.delete("error");

  return `${frontendBase}${url.pathname}${url.search}${url.hash}`;
};
