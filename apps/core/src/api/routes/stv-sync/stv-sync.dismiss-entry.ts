import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stvSyncConfigs, stvSyncReview } from "@/db/schema";
import { readStoredSettings } from "@/stv-sync/settings";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild } from "../guilds/guilds.shared";
import {
  getSyncConfig,
  requireReviewEntry,
  reviewEntryParamsSchema,
} from "./stv-sync.shared";

const MAX_EXCLUDED = 1000;

const dismissQuerySchema = z.object({
  exclude: z.enum(["true", "false"]).optional(),
});

/**
 * Removes an entry from review. `?exclude=true` also adds the emote to the excluded ids
 * ("never sync"), so a later add of the same emote is skipped silently.
 */
export const stvSyncDismissEntry = authFactory.createHandlers(
  requireAuth,
  validate("param", reviewEntryParamsSchema),
  validate("query", dismissQuerySchema),
  async (c) => {
    const { guildId, entryId } = c.req.valid("param");
    const exclude = c.req.valid("query").exclude === "true";

    await getManageableGuild(guildId, c.var);
    const entry = await requireReviewEntry(guildId, entryId);

    await db
      .delete(stvSyncReview)
      .where(and(eq(stvSyncReview.id, entry.id), eq(stvSyncReview.guildId, guildId)));

    const config = exclude ? await getSyncConfig(guildId) : undefined;
    if (config) {
      const settings = readStoredSettings(config.settings);
      const excluded = [
        ...settings.excludedEmoteIds.filter((id) => id !== entry.stvEmoteId),
        entry.stvEmoteId,
      ].slice(-MAX_EXCLUDED);

      await db
        .update(stvSyncConfigs)
        .set({
          settings: { ...settings, excludedEmoteIds: excluded },
          updatedAt: new Date(),
        })
        .where(eq(stvSyncConfigs.guildId, guildId));
    }

    return c.json({ dismissed: entry.id, excluded: !!config }, 200);
  }
);
