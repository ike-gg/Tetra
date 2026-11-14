import { Redis } from "ioredis";

import { env } from "@/env";

import { CoreConsole } from "#/loggers";

export const redisClient = new Redis(env.REDIS_URL);

// ioredis emits `error` on every reconnect attempt; without a listener Node prints
// "Unhandled error event". Log once per outage, and only the code: messages could
// carry connection details.
let redisDown = false;

redisClient.on("error", (error: NodeJS.ErrnoException) => {
  if (redisDown) return;
  redisDown = true;
  CoreConsole.error(`Redis connection error (${error.code ?? error.name}), retrying`);
});

redisClient.on("ready", () => {
  if (!redisDown) return;
  redisDown = false;
  CoreConsole.success("Redis connection restored");
});
