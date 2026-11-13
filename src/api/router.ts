import { randomBytes } from "crypto";
import { DiscordAPIError } from "discord.js";
import { type NextFunction, type Request, type Response, Router } from "express";

import { checkUserAuth } from "./middleware/auth";
import { authRouter } from "./routes/auth/auth-router";
import { guildsRouter } from "./routes/guilds/guilds-router";
import { meRouter } from "./routes/me/me-router";
import { tasksRouter } from "./routes/tasks/tasks-router";
import { TetraAPIError } from "./tetra-api-error";

import { ApiConsole } from "#/loggers";

export const router = Router();

// -- UNPROTECTED ROUTES --

router.use("/auth", authRouter);

// /me includes protected routes, check meRouter structure

router.use("/me", meRouter);

// -- PROTECTED ROUTES --

router.use(checkUserAuth({ fetchUserData: true }));

router.use("/guilds", guildsRouter);
router.use("/tasks", tasksRouter);

const sendApiError = (res: Response, error: TetraAPIError) => {
  res.status(error.code).json({
    error: error.message,
    reference: error.reference,
  });
};

/** Body parser (http-errors) error, e.g. a body over the JSON limit. */
const isBodyParserError = (error: unknown): error is Error & { type: string } =>
  error instanceof Error && "type" in error && typeof error.type === "string";

export const apiErrorHandler = (
  error: Error,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  if (error instanceof TetraAPIError) {
    sendApiError(res, error);
    return;
  }

  if (error instanceof DiscordAPIError) {
    sendApiError(res, new TetraAPIError(400, error.message, "DISCORD_API_ERROR"));
    return;
  }

  if (isBodyParserError(error) && error.type === "entity.too.large") {
    sendApiError(
      res,
      new TetraAPIError(413, "Request body too large", "PAYLOAD_TOO_LARGE")
    );
    return;
  }

  if (isBodyParserError(error) && error.type === "entity.parse.failed") {
    sendApiError(res, new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA"));
    return;
  }

  const ref = randomBytes(8).toString("hex");
  ApiConsole.error(`[${ref}]`, error);

  res.status(500).json({
    error: "Internal Server Error",
    reference: ref,
  });
};

router.use(apiErrorHandler);
