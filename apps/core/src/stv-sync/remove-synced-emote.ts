import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncLinks } from "@/db/schema";
import { discordRestApi } from "@/lib/discord-rest-api";

import { removeQueueEntryForEmote } from "./queue";

import { StvSyncConsole } from "#/loggers";

/**
 * Handles a 7TV removal: drops the emote's queue entry and deletes the Discord emoji
 * tetra created for it. Emojis without a link (added by hand, or deleted by a moderator)
 * are never touched.
 */
export const removeSyncedEmote = async (guildId: string, stvEmoteId: string) => {
  const tag = `[guild ${guildId}] ${stvEmoteId}`;

  if (await removeQueueEntryForEmote(guildId, stvEmoteId)) {
    StvSyncConsole.info(`${tag} removed from the queue`);
  }

  // Deleted first: the gateway emojiDelete that follows then has nothing to drop
  const [link] = await db
    .delete(stvSyncLinks)
    .where(
      and(eq(stvSyncLinks.guildId, guildId), eq(stvSyncLinks.stvEmoteId, stvEmoteId))
    )
    .returning();

  if (!link) {
    StvSyncConsole.info(`${tag} has no linked emoji, nothing to remove`);
    return;
  }

  try {
    await discordRestApi.guilds.deleteEmoji(guildId, link.discordEmojiId, {
      reason: "7TV channel sync: removed from the streamer's set",
    });
    StvSyncConsole.success(`${tag} removed emoji ${link.name} (${link.discordEmojiId})`);
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.UnknownEmoji
    ) {
      StvSyncConsole.info(`${tag} emoji ${link.discordEmojiId} was already gone`);
      return;
    }

    // The emoji still exists, so it stays linked (and visible as synced in the panel)
    await db.insert(stvSyncLinks).values(link).onConflictDoNothing();
    StvSyncConsole.error(
      `${tag} deleting emoji ${link.discordEmojiId} failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }
};
