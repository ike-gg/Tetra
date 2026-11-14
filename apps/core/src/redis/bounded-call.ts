import { redisClient } from ".";

import { CoreConsole } from "#/loggers";

// Past this, Redis counts as down for this request and the caller goes without it
const REDIS_TIMEOUT_MS = 250;

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS).unref()
    ),
  ]);

/**
 * Runs a Redis command for an optional cache: `null` when Redis isn't `ready`, fails or
 * takes longer than 250 ms. ioredis queues commands while disconnected, so a down Redis
 * would otherwise stall the request until it reconnects.
 */
export const boundedRedisCall = async <T>(
  label: string,
  run: () => Promise<T>
): Promise<T | null> => {
  if (redisClient.status !== "ready") return null;
  try {
    return await withTimeout(run());
  } catch (error) {
    CoreConsole.dev.warn(
      `${label} unavailable:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
};
