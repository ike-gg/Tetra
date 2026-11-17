import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncLinks } from "@/db/schema";

import { logSyncActivity } from "./sync-log";

/**
 * Drops the sync link of a deleted Discord emoji. Runs in the shards (gateway
 * `emojiDelete`), so it only touches the database. Idempotent: tetra's own deletes fire
 * the same event after the link is already gone. Logs `link_dropped`.
 */
export const dropSyncLinkForEmoji = async (guildId: string, discordEmojiId: string) => {
  const dropped = await db
    .delete(stvSyncLinks)
    .where(
      and(
        eq(stvSyncLinks.guildId, guildId),
        eq(stvSyncLinks.discordEmojiId, discordEmojiId)
      )
    )
    .returning({
      stvEmoteId: stvSyncLinks.stvEmoteId,
      name: stvSyncLinks.name,
      animated: stvSyncLinks.animated,
    });

  for (const link of dropped) {
    await logSyncActivity(guildId, {
      action: "link_dropped",
      emote: { ...link, discordEmojiId },
    });
  }
  return dropped.length > 0;
};
