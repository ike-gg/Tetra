import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { requireAuth, requireUser } from "../../middleware/auth";

export const meRouter = new Hono<AppEnv>()
  // Only checks the session, without the Discord profile request, to stay fast
  .get("/state", requireAuth, (c) => c.body(null, 200))
  .get("/", requireUser, (c) => c.json(c.get("user"), 200));
