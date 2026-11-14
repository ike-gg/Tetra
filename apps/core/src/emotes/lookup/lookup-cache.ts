import { createHash } from "node:crypto";
import type { z } from "zod";

import { redisClient } from "@/redis";
import { boundedRedisCall } from "@/redis/bounded-call";

const call = <T>(run: () => Promise<T>) => boundedRedisCall("Emote lookup cache", run);

/** Keys built from user text are hashed: bounded length, no separators to collide on. */
export const lookupCacheKey = (prefix: string, ...parts: (string | number)[]) =>
  `${prefix}:${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;

/**
 * Optional cache for provider responses: misses, a down Redis and values that don't match
 * the schema all read as `null`; only successful results are written.
 */
export const cached = async <T extends z.ZodTypeAny>(
  key: string,
  ttlSeconds: number,
  schema: T,
  load: () => Promise<z.infer<T>>
): Promise<z.infer<T>> => {
  const raw = await call(() => redisClient.get(key));
  if (raw) {
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // Unreadable entry: load it again and overwrite
    }
  }

  const value = await load();
  await call(() => redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds));
  return value;
};
