import { NextFunction, Request, Response } from "express";
import { db } from "../../../db";
import { eq } from "drizzle-orm";
import { TetraAPIError } from "../../TetraAPIError";
import { client } from "../../..";
import { Guild, GuildMember } from "discord.js";
import { emotes, removedEmotes } from "../../../db/schema";
import { z } from "zod";

const getGuildParams = z.object({
  guildId: z.string(),
});

export const guildsGetRemovedEmotes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { guildId } = getGuildParams.parse(req.params);

    let guild: Guild;
    try {
      guild = await client.guilds.fetch(guildId);
    } catch {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT"
      );
    }

    let member: GuildMember;
    try {
      member = await guild.members.fetch(req.user!.id);
    } catch {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_MEMBER"
      );
    }

    const hasPermissons = member.permissions.has("ManageGuildExpressions");

    if (!hasPermissons) {
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
