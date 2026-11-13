import type { Response } from "express";
import rateLimit from "express-rate-limit";

import { TIME } from "@/constants/time";

const createRateLimiter = (max: number) =>
  rateLimit({
    windowMs: TIME.MINUTE,
    max,
    // Also sets `Retry-After` when the limit is hit
    standardHeaders: true,
    legacyHeaders: false,
    // Same body as every other API error; goes out after CORS so the browser can read it
    handler: (_, res: Response) => {
      res.status(429).json({ error: "Too many requests", reference: "RATE_LIMITED" });
    },
  });

/** About 120 requests/min per IP for the whole API. */
export const apiRateLimiter = createRateLimiter(120);

/** About 10 requests/min per IP for login start, callback and logout. */
export const authRateLimiter = createRateLimiter(10);
