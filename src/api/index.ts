import cookieSession from "cookie-session";
import cors from "cors";
import express from "express";

// import rateLimit from "express-rate-limit";

import { env, isProduction } from "../env";
import { apiErrorHandler, router } from "./router";

import { ApiConsole } from "#/loggers";

export const initApi = () => {
  const PORT = env.PORT;

  const app = express();

  // Behind a reverse proxy in production; needed for `secure` cookies
  if (isProduction) app.set("trust proxy", 1);

  app.use((_, res, next) => {
    res.setHeader("X-Powered-By", "Tetra Core");
    next();
  });

  // const limiter = rateLimit({
  //   windowMs: 30000,
  //   max: 20,
  // });

  app.use(
    cookieSession({
      name: "tetra-session",
      keys: env.SESSION_KEYS,
      signed: false,
      secure: isProduction,
      httpOnly: true,
      // max age 1 year
      maxAge: 365 * 24 * 60 * 60 * 1000,
      domain: env.COOKIE_DOMAIN,
    })
  );

  app.use(
    cors({
      credentials: true,
      origin: [
        "https://tetra.lol",
        "http://localhost:3001",
        "http://localhost:3000",
        "https://www.tetra.lol",
        "https://panel.tetra.lol",
        "https://tetra.lol",
        "https://dev.tetra.lol",
      ],
    })
  );

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
