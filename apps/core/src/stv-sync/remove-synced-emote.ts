import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncLinks } from "@/db/schema";
import { discordRestApi } from "@/lib/discord-rest-api";
import { createErrorCode, logErrorCode } from "@/utils/error-code";

import { removeReviewEntryForEmote } from "./review";
import { logSyncActivity } from "./sync-log";

import { StvSyncConsole } from "#/loggers";

/**
 * Handles a 7TV removal: drops the emote's review entry and deletes the Discord emoji
 * tetra created for it. Emojis without a link (added by hand, or deleted by a moderator)
 * are never touched.
 */
export const removeSyncedEmote = async (
  guildId: string,
  stvEmoteId: string,
  /** From the event, for the activity log. */
  fromEvent: { name: string | null; animated: boolean | null } = {
    name: null,
    animated: null,
  }
) => {
  const tag = `[guild ${guildId}] ${stvEmoteId}`;

  const reviewEntry = await removeReviewEntryForEmote(guildId, stvEmoteId);
  if (reviewEntry) {
    StvSyncConsole.info(`${tag} removed from review`);
    await logSyncActivity(guildId, {
      action: "review_removed",
      emote: {
        stvEmoteId,
        name: fromEvent.name ?? reviewEntry.name,
        animated: reviewEntry.animated,
      },
    });
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

  const logEmote = {
    stvEmoteId,
    name: fromEvent.name ?? link.name,
    animated: link.animated,
    discordEmojiId: link.discordEmojiId,
  };

  try {
    await discordRestApi.guilds.deleteEmoji(guildId, link.discordEmojiId, {
      reason: "7TV channel sync: removed from the streamer's set",
    });
    StvSyncConsole.success(`${tag} removed emoji ${link.name} (${link.discordEmojiId})`);
    await logSyncActivity(guildId, { action: "removed", emote: logEmote });
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.UnknownEmoji
    ) {
      // Gone already (e.g. deleted while the link was being dropped): still a removal
      StvSyncConsole.info(`${tag} emoji ${link.discordEmojiId} was already gone`);
      await logSyncActivity(guildId, { action: "removed", emote: logEmote });
      return;
    }

    // The emoji still exists, so it stays linked (and visible as synced in the panel)
    await db.insert(stvSyncLinks).values(link).onConflictDoNothing();
    const code = createErrorCode();
    logErrorCode(
      code,
      `[7TV-SYNC] ${tag} deleting emoji ${link.discordEmojiId} failed:`,
      error instanceof Error ? error.message : String(error)
    );
    await logSyncActivity(guildId, {
      action: "failed",
      emote: logEmote,
      stage: "remove",
      code,
    });
  }
};
