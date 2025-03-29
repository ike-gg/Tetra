import OAuth from "discord-oauth2";
import { APIGuild, PermissionsBitField } from "discord.js";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { discordOauth } from "@/index";
import { discordRestApi } from "@/lib/discord-rest-api";

import { db } from "../../../db";
import { removedEmotes } from "../../../db/schema";
import { TetraAPIError } from "../../TetraAPIError";

const getGuildParams = z.object({
  guildId: z.string(),
});

export const guildsGetRemovedEmotes = async (
  req: Request,
  res: Response,
  _: NextFunction
) => {
  try {
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

    const removedEmotesInGuild = await db.query.removedEmotes.findMany({
      where: eq(removedEmotes.guildId, guild.id),
      with: {
        emote: true,
      },
    });

    const emotesToRestore = removedEmotesInGuild
      .filter((removedEmote) => removedEmote.emote)
      .map((removedEmote) => {
        const { emote, deletedWithPanel, id } = removedEmote;
        return { emote, deletedWithPanel, id };
      });

    res.json(emotesToRestore);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    } else {
      throw error;
    }
  }
};
