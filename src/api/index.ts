import cookieSession from "cookie-session";
import cors from "cors";
import express from "express";

import { env, isProduction } from "../env";
import { SESSION_MAX_IDLE } from "./constants/api-constants";
import { apiRateLimiter, authRateLimiter } from "./middleware/rate-limit";
import { apiErrorHandler, router } from "./router";
import { startSessionCleanup } from "./session-cleanup";

import { ApiConsole } from "#/loggers";

export const initApi = () => {
  const PORT = env.PORT;

  const app = express();

  startSessionCleanup();

  // Behind a reverse proxy in production; needed for `secure` cookies
  if (isProduction) app.set("trust proxy", 1);

  app.use((_, res, next) => {
    res.setHeader("X-Powered-By", "Tetra Core");
    next();
  });

  app.use(
    cookieSession({
      name: "tetra-session",
      keys: env.SESSION_KEYS,
      // Not signed: the cookie holds a random token that is checked against the database
      signed: false,
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      // Sliding: the cookie is re-sent when the session is touched (see auth middleware)
      maxAge: SESSION_MAX_IDLE,
      domain: env.COOKIE_DOMAIN,
    })
  );

  app.use(
    cors({
      credentials: true,
      origin: env.CORS_ORIGINS,
    })
  );

  // After CORS: preflight requests are not counted and 429 responses carry CORS headers
  app.use("/api/auth", authRateLimiter);
  app.use("/api", apiRateLimiter);

  // Editor tasks send the emote as a base64 data URL (256 KB file ≈ 350 KB)
  // Not only tasks are send via API. Dont change it
  app.use(express.json({ limit: "2mb" }));

  app.use((req, _, next) => {
    ApiConsole.info(`${req.method.toUpperCase()}::${req.url}`);
    next();
  });

  app.use("/api", router);

  // Errors raised before the router, e.g. by the JSON body parser
  app.use(apiErrorHandler);

  app.listen(PORT, () => {
    ApiConsole.log(`Listening on ${env.BACKEND_URL}`);
  });
};
