import { eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncConfigs, stvSyncLinks, stvSyncQueue } from "@/db/schema";
import { stvSync } from "@/stv-sync/sync-service";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { buildSyncState, requireSyncConfig } from "./stv-sync.shared";

import { StvSyncConsole } from "#/loggers";

/**
 * Stops syncing and forgets the channel: links and queue are dropped, the Discord emotes
 * stay. Links are keyed by 7TV emote id, so keeping them would let another channel's
 * removal delete them after a relink.
 */
export const stvSyncUnlink = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");

    await getManageableGuild(guildId, c.var);
    await requireSyncConfig(guildId);

    await db.transaction(async (tx) => {
      await tx.delete(stvSyncLinks).where(eq(stvSyncLinks.guildId, guildId));
      await tx.delete(stvSyncQueue).where(eq(stvSyncQueue.guildId, guildId));
      await tx.delete(stvSyncConfigs).where(eq(stvSyncConfigs.guildId, guildId));
    });

    StvSyncConsole.info(`[guild ${guildId}] unlinked`);
    await stvSync.refresh();

    return c.json(await buildSyncState(guildId), 200);
  }
);
