import OAuth from "discord-oauth2";
import { APIGuild, DiscordAPIError, PermissionsBitField } from "discord.js";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { discordOauth } from "@/index";
import { optimizeBuffer } from "@/lib/buffer/optimize-buffer";
import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import getBufferFromUrl from "../../../emotes/source/getBufferFromUrl";
import { TetraAPIError } from "../../TetraAPIError";

const getGuildParams = z.object({
  guildId: z.string(),
});

const bodyPostEmote = z.object({
  name: z.string(),
  file: z.string().url(),
  fitting: z.enum(["fill", "cover", "contain"]).optional(),
});

export const guildsPostEmote = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { file, name, fitting } = bodyPostEmote.parse(req.body);
    const { guildId } = getGuildParams.parse(req.params);

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

    let emoteBuffer: Buffer;

    try {
      emoteBuffer = await getBufferFromUrl(file);
    } catch {
      throw new TetraAPIError(
        400,
        "Failed to download data of the provided emote",
        "DOWNLOAD_DATA_FAILED"
      );
    }

    const { buffer: optimizedBuffer, metadata } = await optimizeBuffer(emoteBuffer, {
      fitting,
    });

    const base64 = `data:image/${metadata.format};base64,${optimizedBuffer.toString("base64")}`;

    const createdEmote = await discordRestApi.guilds.createEmoji(guildId, {
      image: base64,
      name,
    });

    const emoteUrl = getEmoteUrl(createdEmote);

    res.json({
      message: `Emote ${createdEmote.name} created in ${guild.name}!`,
      preview: emoteUrl,
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
