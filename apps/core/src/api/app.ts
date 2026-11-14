import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

import { env } from "@/env";

import type { AppEnv } from "./api-env";
import { apiErrorHandler, apiNotFound } from "./error-handler";
import { apiRateLimiter, authRateLimiter } from "./middleware/rate-limit";
import { session } from "./middleware/session";
import { authRouter } from "./routes/auth/auth-router";
import { emotesRouter } from "./routes/emotes/emotes-router";
import { guildsRouter } from "./routes/guilds/guilds-router";
import { meRouter } from "./routes/me/me-router";
import { tasksRouter } from "./routes/tasks/tasks-router";
import { TetraAPIError } from "./tetra-api-error";

import { ApiConsole } from "#/loggers";

export const routes = new Hono<AppEnv>()
  .route("/auth", authRouter)
  .route("/me", meRouter)
  .route("/guilds", guildsRouter)
  .route("/tasks", tasksRouter)
  .route("/emotes", emotesRouter);

export const app = new Hono<AppEnv>()
  .use(async (c, next) => {
    // Path only: the OAuth callback carries the code in the query
    ApiConsole.info(`${c.req.method}::${c.req.path}`);
    c.header("X-Powered-By", "Tetra Core");
    await next();
  })
  .use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  // After CORS: preflight requests are not counted and 429 responses carry CORS headers
  .use("/api/auth/*", authRateLimiter)
  .use("/api/*", apiRateLimiter)
  .use(
    "/api/*",
    // Editor tasks send the emote as a base64 data URL (256 KB file ≈ 350 KB), and not
    // only tasks post data. Don't lower it.
    bodyLimit({
      maxSize: 2 * 1024 * 1024,
      onError: () => {
        throw new TetraAPIError(413, "Request body too large", "PAYLOAD_TOO_LARGE");
      },
    })
  )
  .use("/api/*", session)
  .route("/api", routes)
  .notFound(apiNotFound)
  .onError(apiErrorHandler);

/** Routes under `/api`, for the typed client in the web app: `hc<AppType>(`${origin}/api`)`. */
export type AppType = typeof routes;

export type { ApiErrorBody } from "./error-handler";
