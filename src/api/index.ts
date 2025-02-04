import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { router } from "./router";
import { env } from "../env";
import cookieSession from "cookie-session";
import { ApiConsole } from "./utils/api-console";

export const initApi = () => {
  const PORT = env.PORT;

  const app = express();

  const limiter = rateLimit({
    windowMs: 30000,
    max: 20,
  });

  app.use(
    cookieSession({
      name: "tetra-session",
      keys: env.SESSION_KEYS,
      // max age 1 year
      maxAge: 365 * 24 * 60 * 60 * 1000,
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

  app.use(express.json());

  // app.use(
  //   bodyParser.json({
  //     limit: "10mb",
  //   })
  // );

  app.use("/api", router);

  app.listen(PORT, () => {
    ApiConsole.log(`Listening on ${env.BACKEND_URL}`);
  });
};
