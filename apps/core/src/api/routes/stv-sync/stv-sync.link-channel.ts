import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stvSyncConfigs, stvSyncLinks, stvSyncLog, stvSyncReview } from "@/db/schema";
import { getTwitchChannel } from "@/emotes/lookup/twitch-channel-lookup";
import { DEFAULT_SYNC_SETTINGS } from "@/stv-sync/settings";
import { getStvChannel } from "@/stv-sync/stv-user";
import { logSyncActivity } from "@/stv-sync/sync-log";
import { stvSync } from "@/stv-sync/sync-service";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { withLookupErrors } from "../emotes/emotes.shared";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { twitchChannelIdSchema, twitchLoginSchema } from "../twitch/twitch.shared";
import { buildSyncState, getSyncConfig } from "./stv-sync.shared";

import { StvSyncConsole } from "#/loggers";

const bodyLinkChannel = z.union([
  z.object({ twitchId: twitchChannelIdSchema }),
  z.object({ login: twitchLoginSchema }),
]);

/**
 * Links a Twitch channel (by id or login) and starts syncing its active 7TV set. Linking
 * another channel replaces the old one and drops its links, review list and activity log;
 * linking the same channel again only refreshes the ids and keeps everything.
 */
export const stvSyncLinkChannel = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  validate("json", bodyLinkChannel),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const body = c.req.valid("json");

    await getManageableGuild(guildId, c.var);

    const twitchId =
      "twitchId" in body
        ? body.twitchId
        : (await withLookupErrors(() => getTwitchChannel(body.login))).id;

    const channel = await withLookupErrors(() => getStvChannel(twitchId));
    if (!channel) {
      throw new TetraAPIError(
        404,
        "this Twitch channel has no 7TV account",
        "STV_USER_NOT_FOUND"
      );
    }

    const existing = await getSyncConfig(guildId);
    const sameChannel = existing?.twitchId === channel.twitchId;

    await db.transaction(async (tx) => {
      if (existing && !sameChannel) {
        await tx.delete(stvSyncLinks).where(eq(stvSyncLinks.guildId, guildId));
        await tx.delete(stvSyncReview).where(eq(stvSyncReview.guildId, guildId));
        await tx.delete(stvSyncLog).where(eq(stvSyncLog.guildId, guildId));
      }

      const values = {
        twitchId: channel.twitchId,
        twitchLogin: channel.twitchLogin,
        twitchDisplayName: channel.twitchDisplayName,
        stvUserId: channel.stvUserId,
        emoteSetId: channel.emoteSetId,
        linkedBy: c.var.discordUserId,
        updatedAt: new Date(),
      };

      await tx
        .insert(stvSyncConfigs)
        .values({ guildId, enabled: true, settings: DEFAULT_SYNC_SETTINGS, ...values })
        .onConflictDoUpdate({
          target: stvSyncConfigs.guildId,
          set: sameChannel ? values : { ...values, createdAt: new Date() },
        });
    });

    StvSyncConsole.info(
      `[guild ${guildId}] linked ${channel.twitchLogin} (7TV user ${channel.stvUserId}, set ${channel.emoteSetId ?? "none"})`
    );
    await logSyncActivity(guildId, {
      action: "linked",
      login: channel.twitchLogin,
      twitchId: channel.twitchId,
    });
    await stvSync.refresh();

    return c.json(await buildSyncState(guildId), 200);
  }
);
