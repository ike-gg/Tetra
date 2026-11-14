import type { z } from "zod";

import { EmoteLookupError } from "./catalog-emote";

import { CoreConsole } from "#/loggers";

const UPSTREAM_TIMEOUT_MS = 10_000;

export const upstreamError = (provider: string) =>
  new EmoteLookupError("UPSTREAM_ERROR", `${provider} is not responding right now`);

/**
 * `fetch` to a fixed provider host (never a user-supplied host: those go through
 * `safeFetch`). Network errors and timeouts become `UPSTREAM_ERROR`.
 */
export const fetchUpstream = async (
  provider: string,
  url: string,
  init?: RequestInit
) => {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    CoreConsole.warn(
      `${provider} request failed:`,
      error instanceof Error ? error.name : error
    );
    throw upstreamError(provider);
  }
};

/** Parses a provider's JSON body; an unexpected shape counts as an upstream failure. */
export const readUpstreamJson = async <T extends z.ZodTypeAny>(
  provider: string,
  response: Response,
  schema: T
): Promise<z.infer<T>> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw upstreamError(provider);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    CoreConsole.warn(
      `${provider} answered with an unexpected shape:`,
      parsed.error.issues[0]?.path.join(".")
    );
    throw upstreamError(provider);
  }
  return parsed.data;
};

export const emoteNotFound = () =>
  new EmoteLookupError("EMOTE_NOT_FOUND", "The emote doesn't exist or was removed");

/** HEAD to a fixed CDN host: status and media type only. */
export const headUpstream = async (provider: string, url: string) => {
  const response = await fetchUpstream(provider, url, { method: "HEAD" });
  return {
    status: response.status,
    contentType: response.headers.get("content-type")?.split(";")[0].trim() ?? null,
  };
};
