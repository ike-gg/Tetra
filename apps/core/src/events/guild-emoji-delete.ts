import type { Events } from "discord.js";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { EmoteOrigin, emotes, removedEmotes } from "@/db/schema";
import { dropSyncLinkForEmoji } from "@/stv-sync/links";

import type { EventHandler } from ".";

import { BotConsole } from "#/loggers";

export const guildEmojiDeleteHandler: EventHandler<Events.GuildEmojiDelete> = async (
  removedEmote
) => {
  // A moderator deleting a synced emoji ends its 7TV sync; tetra's own sync removals
  // drop the link before deleting, so this finds nothing then
  dropSyncLinkForEmoji(removedEmote.guild.id, removedEmote.id)
    .then((dropped) => {
      if (dropped) {
        BotConsole.info(
          `[7TV-SYNC] emoji ${removedEmote.id} deleted in guild ${removedEmote.guild.id}, link dropped`
        );
      }
    })
    .catch((error) => {
      BotConsole.error(
        `[7TV-SYNC] dropping the link of emoji ${removedEmote.id} failed:`,
        error
      );
    });

  try {
    const guildId = removedEmote.guild.id;

    // `emotes.external_id` is not unique (the panel inserts a row per removal), so look
    // for the removal record of this guild instead of taking the first emote row.
    const [alreadyRemoved] = await db
      .select({ id: removedEmotes.id })
      .from(removedEmotes)
      .innerJoin(emotes, eq(removedEmotes.emoteId, emotes.id))
      .where(
        and(eq(emotes.externalId, removedEmote.id), eq(removedEmotes.guildId, guildId))
      )
      .limit(1);

    if (alreadyRemoved) {
      BotConsole.dev.warn(
        `Deleted emote already in db. Skipping ${removedEmote.name} from ${removedEmote.guild.name} guild.`
      );

      return;
    }

    const knownEmote = await db.query.emotes.findFirst({
      where: eq(emotes.externalId, removedEmote.id),
      orderBy: asc(emotes.id),
    });

    // if emote found but not removed on this guild yet
    if (knownEmote) {
      await db.insert(removedEmotes).values({
        deletedWithPanel: false,
        emoteId: knownEmote.id,
        guildId,
      });

      BotConsole.dev.success(
        `Removed emote ${removedEmote.name} from ${removedEmote.guild.name} guild was assigned to the database.`
      );

      return;
    }

    // if emote not found
    await db.transaction(async (tx) => {
      const [insertedEmote] = await tx
        .insert(emotes)
        .values({
          externalId: removedEmote.id,
          isAnimated: removedEmote.animated ?? false,
          name: removedEmote.name ?? "Emote",
          origin: EmoteOrigin.DISCORD,
          previewUrl: removedEmote.imageURL({
            extension: removedEmote.animated ? "gif" : "webp",
            size: 64,
          }),
          url: removedEmote.imageURL({
            extension: removedEmote.animated ? "gif" : "webp",
          }),
        })
        .returning();

      await tx.insert(removedEmotes).values({
        deletedWithPanel: false,
        emoteId: insertedEmote.id,
        guildId,
      });
    });

    BotConsole.dev.success(
      `Removed emote ${removedEmote.name} from ${removedEmote.guild.name} guild was added to the database.`
    );
  } catch (error) {
    BotConsole.error(
      `Failed to save removed emote ${removedEmote.id} (guild ${removedEmote.guild.id}):`,
      error
    );
  }
};
