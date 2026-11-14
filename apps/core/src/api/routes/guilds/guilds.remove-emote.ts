import { eq } from "drizzle-orm";
import { z } from "zod";

import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord";

import { db } from "../../../db";
import { EmoteOrigin, emotes, removedEmotes } from "../../../db/schema";
import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "./guilds.shared";

import { ApiConsole } from "#/loggers";

const removeParamsSchema = guildParamsSchema.extend({
  emoteId: z.string(),
});

export const guildsRemoveEmote = authFactory.createHandlers(
  requireAuth,
  validate("param", removeParamsSchema),
  async (c) => {
    const { guildId, emoteId } = c.req.valid("param");

    const [guild, emoteResult] = await Promise.all([
      getManageableGuild(guildId, c.get("accessToken")),
      discordRestApi.guilds.getEmoji(guildId, emoteId).then(
        (emote) => ({ ok: true as const, emote }),
        () => ({ ok: false as const })
      ),
    ]);

    if (!emoteResult.ok) {
      throw new TetraAPIError(404, "Emote not found", "GUILD_EMOTE_NOT_FOUND");
    }

    const { emote } = emoteResult;

    if (!emote.id) {
      throw new TetraAPIError(400, "Invalid emote", "INVALID_EMOTE");
    }

    const discordEmoteId = emote.id;

    // Both rows are written before the Discord delete, so the GuildEmojiDelete event
    // finds this record and skips it.
    const { insertedEmote, insertedRemovedEmote } = await db.transaction(async (tx) => {
      const [insertedEmote] = await tx
        .insert(emotes)
        .values({
          externalId: discordEmoteId,
          isAnimated: emote.animated ?? false,
          name: emote.name ?? "Emote",
          origin: EmoteOrigin.DISCORD,
          previewUrl: getEmoteUrl(emote, { size: 128 }),
          url: getEmoteUrl(emote),
        })
        .returning();

      const [insertedRemovedEmote] = await tx
        .insert(removedEmotes)
        .values({
          deletedWithPanel: true,
          emoteId: insertedEmote.id,
          guildId: guild.id,
        })
        .returning();

      return { insertedEmote, insertedRemovedEmote };
    });

    try {
      await discordRestApi.guilds.deleteEmoji(guildId, discordEmoteId);
    } catch {
      // The emote still exists on Discord, so it must not be offered for restore.
      try {
        await db.transaction(async (tx) => {
          await tx
            .delete(removedEmotes)
            .where(eq(removedEmotes.id, insertedRemovedEmote.id));
          await tx.delete(emotes).where(eq(emotes.id, insertedEmote.id));
        });
      } catch (cleanupError) {
        ApiConsole.error(
          `Failed to clean up records of emote ${discordEmoteId} after a failed delete in guild ${guildId}:`,
          cleanupError
        );
      }

      throw new TetraAPIError(400, "Failed to delete emote", "GUILD_EMOTE_DELETE_FAILED");
    }

    return c.json(
      {
        message: `Emote ${emote.name} deleted from ${guild.name}`,
        preview: getEmoteUrl(emote),
      },
      200
    );
  }
);
