import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
  EmoteLookupError,
  type EmoteLookupErrorCode,
} from "@/emotes/lookup/catalog-emote";

import { TetraAPIError } from "../../tetra-api-error";

const STATUS: Record<EmoteLookupErrorCode, ContentfulStatusCode> = {
  UNSUPPORTED_LINK: 400,
  URL_NOT_ALLOWED: 400,
  EMOTE_NOT_FOUND: 404,
  UNSUPPORTED_FILE_TYPE: 415,
  FILE_TOO_LARGE: 413,
  UPSTREAM_ERROR: 502,
  PROVIDER_UNAVAILABLE: 503,
};

/** Runs a lookup and turns its errors into API errors with the same `reference` code. */
export const withLookupErrors = async <T>(run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof EmoteLookupError) {
      throw new TetraAPIError(STATUS[error.code], error.message, error.code);
    }
    throw error;
  }
};
