import OAuth from "discord-oauth2";
import { APIGuild, DiscordAPIError, PermissionsBitField } from "discord.js";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import getBufferFromUrl from "@/emotes/source/getBufferFromUrl";
import { discordOauth } from "@/index";
import { optimizeBuffer } from "@/lib/buffer/optimize-buffer";
import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord";

import { db } from "../../../db";
import { removedEmotes } from "../../../db/schema";
import { TetraAPIError } from "../../TetraAPIError";

const getGuildParams = z.object({
  guildId: z.string(),
  restoreId: z.string(),
});

export const guildsRestoreEmote = async (
  req: Request,
  res: Response,
  _: NextFunction
) => {
  try {
    const { guildId, restoreId } = getGuildParams.parse(req.params);

    const promises = [
      discordRestApi.guilds.get(guildId),
      discordOauth.getUserGuilds(req.accessToken!),
    ];

    const [guildPromise, guildsPromise] = await Promise.allSettled(promises);

    if (guildPromise.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT"
      );
    }

    if (guildsPromise.status === "rejected") {
      throw new TetraAPIError(404, "Guild not found", "OAUTH_GET_GUILDS_ERROR");
    }

    const guildMember = (guildsPromise.value as OAuth.PartialGuild[]).find(
      (guild) => guild.id === guildId
    );

    if (!guildMember) {
      throw new TetraAPIError(404, "Guild not found", "USER_NOT_IN_GUILD");
    }

    const guild = guildPromise.value as APIGuild;

    const userPermissions = new PermissionsBitField(BigInt(guildMember.permissions!));

    if (!userPermissions.has("ManageGuildExpressions")) {
      throw new TetraAPIError(403, "Missing permissions", "MISSING_PERMISSIONS");
    }

    const removedEmote = await db.query.removedEmotes.findFirst({
      where: eq(removedEmotes.id, Number(restoreId)),
      with: {
        emote: true,
      },
    });

    if (!removedEmote || !removedEmote.emote) {
      throw new TetraAPIError(404, "Emote not found", "EMOTE_NOT_FOUND");
    }

    const { emote } = removedEmote;

    const emoteBuffer = await getBufferFromUrl(emote.url);
    const { buffer: optimizedBuffer, metadata } = await optimizeBuffer(emoteBuffer);

    const base64 = `data:image/${metadata.format};base64,${optimizedBuffer.toString("base64")}`;

    const createdEmote = await discordRestApi.guilds.createEmoji(guildId, {
      image: base64,
      name: emote.name,
    });

    const preview = getEmoteUrl(createdEmote);

    await db.delete(removedEmotes).where(eq(removedEmotes.id, Number(restoreId)));

    res.json({
      message: `Emote ${createdEmote.name} restored in ${guild.name}!`,
      preview,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    } else if (error instanceof DiscordAPIError) {
      throw new TetraAPIError(400, error.message, "DISCORD_API_ERROR");
    } else {
      throw error;
    }
  }
};
