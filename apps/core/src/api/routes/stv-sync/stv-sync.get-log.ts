import { z } from "zod";

import { listSyncLog, serializeSyncLogEntry } from "@/stv-sync/sync-log";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";

const logQuerySchema = z.object({
  /** The `nextCursor` of the previous page (an entry id). */
  before: z
    .string()
    .regex(/^\d{1,10}$/)
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
});

/** The sync's activity log, newest first, paged by entry id. */
export const stvSyncGetLog = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  validate("query", logQuerySchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const { before, limit = 50 } = c.req.valid("query");

    await getManageableGuild(guildId, c.var);

    // One extra row tells whether another page exists
    const rows = await listSyncLog(guildId, limit + 1, before);
    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? String(page[page.length - 1].id) : null;

    return c.json({ entries: page.map(serializeSyncLogEntry), nextCursor }, 200);
  }
);
