import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { MAX_SUPPORTED_SIZE } from "@/constants";
import { ResourceTooLargeError } from "@/constants/errors";
import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";
import { optimizeBuffer } from "@/lib/buffer/optimize-buffer";
import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord";

import { db } from "../../../db";
import { removedEmotes } from "../../../db/schema";
import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "./guilds.shared";

const restoreParamsSchema = guildParamsSchema.extend({
  restoreId: z.coerce.number().int().positive(),
});

export const guildsRestoreEmote = authFactory.createHandlers(
  requireAuth,
  validate("param", restoreParamsSchema),
  async (c) => {
    const { guildId, restoreId } = c.req.valid("param");

    const guild = await getManageableGuild(guildId, c.var);

    const removedEmote = await db.query.removedEmotes.findFirst({
      where: and(eq(removedEmotes.id, restoreId), eq(removedEmotes.guildId, guildId)),
      with: { emote: true },
    });

    if (!removedEmote?.emote) {
      throw new TetraAPIError(404, "Emote not found", "EMOTE_NOT_FOUND");
    }

    const { emote } = removedEmote;

    let emoteBuffer: Buffer;
    try {
      emoteBuffer = await getBufferFromUrl(emote.url, {
        maxBufferSize: MAX_SUPPORTED_SIZE,
      });
    } catch (error) {
      if (error instanceof ResourceTooLargeError) throw error;
      // Deleted emote images stay on the Discord CDN only for a while
      throw new TetraAPIError(
        400,
        "Failed to download data of the removed emote",
        "DOWNLOAD_DATA_FAILED"
      );
    }
    const { buffer: optimizedBuffer, metadata } = await optimizeBuffer(emoteBuffer);

    const createdEmote = await discordRestApi.guilds.createEmoji(guildId, {
      image: `data:image/${metadata.format};base64,${optimizedBuffer.toString("base64")}`,
      name: emote.name,
    });

    await db.delete(removedEmotes).where(eq(removedEmotes.id, removedEmote.id));

    return c.json(
      {
        message: `Emote ${createdEmote.name} restored in ${guild.name}!`,
        preview: getEmoteUrl(createdEmote),
      },
      200
    );
  }
);
