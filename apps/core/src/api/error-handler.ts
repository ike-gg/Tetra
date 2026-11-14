import { randomBytes } from "node:crypto";
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { EmoteTooLargeError } from "@/constants/errors";

import { API_CONSTANTS } from "./constants/api-constants";
import { DEFAULT_RETURN_PATH, frontendUrl } from "./routes/auth/auth.shared";
import { TetraAPIError } from "./tetra-api-error";

import { ApiConsole } from "#/loggers";

/** Body of every API error response. */
export type ApiErrorBody = { error: string; reference?: string };

const sendApiError = (c: Context, error: TetraAPIError) =>
  c.json<ApiErrorBody>(
    { error: error.message, reference: error.reference },
    error.code as ContentfulStatusCode
  );

const emoteTooLarge = () =>
  new TetraAPIError(
    413,
    "Emote is too large for Discord's 256 KB limit",
    "EMOTE_TOO_LARGE"
  );

// Discord nests field errors under the request body's keys, e.g. `errors.name._errors`
const isNameFieldError = (error: DiscordAPIError) =>
  "errors" in error.rawError &&
  typeof error.rawError.errors === "object" &&
  error.rawError.errors !== null &&
  "name" in error.rawError.errors;

/**
 * Stable codes for the Discord errors the panel can explain to the user, with our own
 * message instead of Discord's. `null` for everything else.
 */
export const mapDiscordApiError = (error: DiscordAPIError): TetraAPIError | null => {
  switch (error.code) {
    case RESTJSONErrorCodes.MaximumNumberOfEmojisReached:
    case RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached:
      return new TetraAPIError(
        409,
        "The server has no free emote slots",
        "GUILD_EMOJI_LIMIT_REACHED"
      );
    case RESTJSONErrorCodes.MissingPermissions:
    case RESTJSONErrorCodes.MissingAccess:
      return new TetraAPIError(
        403,
        "Tetra is missing permissions on this server",
        "BOT_MISSING_PERMISSIONS"
      );
    case RESTJSONErrorCodes.FailedToResizeAssetBelowTheMaximumSize:
    case RESTJSONErrorCodes.FileUploadedExceedsMaximumSize:
      return emoteTooLarge();
    case RESTJSONErrorCodes.InvalidFileUploaded:
      return new TetraAPIError(
        400,
        "Discord rejected the emote file",
        "INVALID_EMOTE_FILE"
      );
    case RESTJSONErrorCodes.InvalidFormBodyOrContentType:
      return isNameFieldError(error)
        ? new TetraAPIError(400, "Discord rejected the emote name", "INVALID_EMOTE_NAME")
        : null;
    default:
      return null;
  }
};

export const apiErrorHandler = (error: Error, c: Context) => {
  // The callback is a browser navigation: errors from middleware before it (the rate
  // limiter) go back to the panel like the callback's own errors
  if (c.req.path === API_CONSTANTS.RELATIVE_REDIRECT_URI) {
    const rateLimited = error instanceof TetraAPIError && error.code === 429;
    if (!rateLimited) ApiConsole.error("OAuth callback failed:", error.name);
    return c.redirect(
      frontendUrl(
        DEFAULT_RETURN_PATH,
        rateLimited ? "RATE_LIMITED" : "AUTH_CALLBACK_ERROR"
      )
    );
  }

  if (error instanceof TetraAPIError) return sendApiError(c, error);

  if (error instanceof EmoteTooLargeError) return sendApiError(c, emoteTooLarge());

  if (error instanceof DiscordAPIError) {
    return sendApiError(
      c,
      mapDiscordApiError(error) ??
        new TetraAPIError(400, error.message, "DISCORD_API_ERROR")
    );
  }

  // Thrown by Hono itself, e.g. for a malformed JSON body
  if (error instanceof HTTPException && error.status < 500) {
    return sendApiError(
      c,
      new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA")
    );
  }

  const ref = randomBytes(8).toString("hex");
  ApiConsole.error(`[${ref}]`, error);

  return c.json<ApiErrorBody>({ error: "Internal Server Error", reference: ref }, 500);
};

export const apiNotFound = (c: Context) =>
  sendApiError(c, new TetraAPIError(404, "Not found", "NOT_FOUND"));
