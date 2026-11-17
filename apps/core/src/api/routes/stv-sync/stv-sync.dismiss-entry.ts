import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stvSyncConfigs, stvSyncQueue } from "@/db/schema";
import { readStoredSettings } from "@/stv-sync/settings";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild } from "../guilds/guilds.shared";
import {
  getSyncConfig,
  queueEntryParamsSchema,
  requireQueueEntry,
} from "./stv-sync.shared";

const MAX_EXCLUDED = 1000;

const dismissQuerySchema = z.object({
  exclude: z.enum(["true", "false"]).optional(),
});

/**
 * Removes a queue entry. `?exclude=true` also adds the emote to the excluded ids, so a
 * later add of the same emote is skipped without queueing.
 */
export const stvSyncDismissEntry = authFactory.createHandlers(
  requireAuth,
  validate("param", queueEntryParamsSchema),
  validate("query", dismissQuerySchema),
  async (c) => {
    const { guildId, entryId } = c.req.valid("param");
    const exclude = c.req.valid("query").exclude === "true";

    await getManageableGuild(guildId, c.var);
    const entry = await requireQueueEntry(guildId, entryId);

    await db
      .delete(stvSyncQueue)
      .where(and(eq(stvSyncQueue.id, entry.id), eq(stvSyncQueue.guildId, guildId)));

    const config = exclude ? await getSyncConfig(guildId) : undefined;
    if (config) {
      const settings = readStoredSettings(config.settings);
      const excluded = [
        ...settings.filters.excludedEmoteIds.filter((id) => id !== entry.stvEmoteId),
        entry.stvEmoteId,
      ].slice(-MAX_EXCLUDED);

      await db
        .update(stvSyncConfigs)
        .set({
          settings: {
            ...settings,
            filters: { ...settings.filters, excludedEmoteIds: excluded },
          },
          updatedAt: new Date(),
        })
        .where(eq(stvSyncConfigs.guildId, guildId));
    }

    return c.json({ dismissed: entry.id, excluded: !!config }, 200);
  }
);
