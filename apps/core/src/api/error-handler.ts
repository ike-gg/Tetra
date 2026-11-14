import { randomBytes } from "node:crypto";
import { DiscordAPIError } from "discord.js";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { TetraAPIError } from "./tetra-api-error";

import { ApiConsole } from "#/loggers";

/** Body of every API error response. */
export type ApiErrorBody = { error: string; reference?: string };

const sendApiError = (c: Context, error: TetraAPIError) =>
  c.json<ApiErrorBody>(
    { error: error.message, reference: error.reference },
    error.code as ContentfulStatusCode
  );

export const apiErrorHandler = (error: Error, c: Context) => {
  if (error instanceof TetraAPIError) return sendApiError(c, error);

  if (error instanceof DiscordAPIError) {
    return sendApiError(c, new TetraAPIError(400, error.message, "DISCORD_API_ERROR"));
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
