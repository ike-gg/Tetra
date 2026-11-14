import { env } from "../env";
import { app } from "./app";
import { startSessionCleanup } from "./session-cleanup";

import { ApiConsole } from "#/loggers";

export const initApi = () => {
  startSessionCleanup();

  Bun.serve({
    port: Number(env.PORT),
    // Bun's default (10 s) is too short: adding or restoring an emote optimizes it in-process
    idleTimeout: 120,
    fetch: (request, server) => app.fetch(request, { server }),
  });

  ApiConsole.log(`Listening on ${env.BACKEND_URL}`);
};
