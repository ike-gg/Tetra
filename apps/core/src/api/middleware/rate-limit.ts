import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import { TIME } from "@/constants/time";
import { isProduction } from "@/env";

import type { AppEnv } from "../api-env";
import { TetraAPIError } from "../tetra-api-error";

/**
 * Production runs behind exactly one reverse proxy, which appends the real client
 * address as the last `X-Forwarded-For` entry; earlier entries are client-controlled.
 */
export const getClientIp = (c: Context<AppEnv>) => {
  if (isProduction) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();
    if (forwarded) return forwarded;
  }

  return c.env.server.requestIP(c.req.raw)?.address ?? "unknown";
};

/** Fixed-window, in-memory limiter keyed by client IP. */
const createRateLimiter = (max: number, windowMs = TIME.MINUTE) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return createMiddleware<AppEnv>(async (c, next) => {
    const now = Date.now();
    const key = getClientIp(c);

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    c.header("RateLimit-Limit", String(max));
    c.header("RateLimit-Remaining", String(Math.max(max - entry.count, 0)));
    c.header("RateLimit-Reset", String(resetSeconds));

    if (entry.count > max) {
      c.header("Retry-After", String(resetSeconds));
      throw new TetraAPIError(429, "Too many requests", "RATE_LIMITED");
    }

    await next();
  });
};

/** About 120 requests/min per IP for the whole API. */
export const apiRateLimiter = createRateLimiter(120);

/** About 10 requests/min per IP for login start, callback and logout. */
export const authRateLimiter = createRateLimiter(10);
