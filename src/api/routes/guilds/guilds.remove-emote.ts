import OAuth from "discord-oauth2";
import { APIEmoji, APIGuild, DiscordAPIError, PermissionsBitField } from "discord.js";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { discordOauth } from "@/index";
import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord";

import { db } from "../../../db";
import { EmoteOrigin, emotes, removedEmotes } from "../../../db/schema";
import { TetraAPIError } from "../../TetraAPIError";

const getGuildParams = z.object({
  guildId: z.string(),
  emoteId: z.string(),
});

export const guildsRemoveEmote = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { guildId, emoteId } = getGuildParams.parse(req.params);

    const promises = [
      discordRestApi.guilds.get(guildId),
      discordOauth.getUserGuilds(req.accessToken!),
      discordRestApi.guilds.getEmoji(guildId, emoteId),
    ];

    const [guildPromise, guildsPromise, emotePromise] =
      await Promise.allSettled(promises);

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

    if (emotePromise.status === "rejected") {
      throw new TetraAPIError(404, "Emote not found", "GUILD_EMOTE_NOT_FOUND");
    }

    const guildMember = (guildsPromise.value as OAuth.PartialGuild[]).find(
      (guild) => guild.id === guildId
    );

    if (!guildMember) {
      throw new TetraAPIError(404, "Guild not found", "USER_NOT_IN_GUILD");
    }

    const guild = guildPromise.value as APIGuild;
    const emote = emotePromise.value as APIEmoji;

    const userPermissions = new PermissionsBitField(BigInt(guildMember.permissions!));

    if (!userPermissions.has("ManageGuildExpressions")) {
      throw new TetraAPIError(403, "Missing permissions", "MISSING_PERMISSIONS");
    }

    if (!emote.id) {
      throw new TetraAPIError(400, "Invalid emote", "INVALID_EMOTE");
    }

    const [insertedEmote] = await db
      .insert(emotes)
      .values({
        externalId: emote.id,
        isAnimated: emote.animated ?? false,
        name: emote.name ?? "Emote",
        origin: EmoteOrigin.DISCORD,
        previewUrl: getEmoteUrl(emote, { size: 128 }),
        url: getEmoteUrl(emote),
      })
      .returning();

    await db.insert(removedEmotes).values({
      deletedWithPanel: true,
      emoteId: insertedEmote.id,
      guildId: guild.id,
    });

    try {
      await discordRestApi.guilds.deleteEmoji(guildId, emote.id);
    } catch {
      throw new TetraAPIError(400, "Failed to delete emote", "GUILD_EMOTE_DELETE_FAILED");
    }

    res.json({
      message: `Emote ${emote.name} deleted from ${guild.name}`,
      preview: getEmoteUrl(emote),
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
