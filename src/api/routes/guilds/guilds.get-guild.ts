import { NextFunction, Request, Response } from "express";
import { db } from "../../../db";
import { eq } from "drizzle-orm";
import { TetraAPIError } from "../../TetraAPIError";
import { discordOauth } from "../../..";
import { client } from "../../..";
import { Guild, GuildMember, Options, PermissionsBitField } from "discord.js";
import OAuth from "discord-oauth2";
import { users } from "../../../db/schema";
import { z } from "zod";
import { guildParsePremium } from "../../../utils/discord/guildParsePremium";
import { ApiConsole } from "../../utils/api-console";

const getGuildQuerySchema = z.object({
  guildId: z.string(),
});

export const guildsGetGuild = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { guildId } = getGuildQuerySchema.parse(req.params);

    ApiConsole.dev.info("Checking user in db...");

    const user = await db.query.users.findFirst({
      where: eq(users.discord_id, req.user!.id),
    });

    if (!user)
      throw new TetraAPIError(
        500,
        "Internal Server Error",
        "AUTH_PASSED_USER_NOT_FOUND_ME_GET_GUILD"
      );

    // ApiConsole.dev.info("Checking users guild to get the specific one.");

    // let userInGuild: OAuth.Member;
    // try {
    //   userInGuild = await discordOauth.getGuildMember(user.access_token, guildId);
    // } catch {
    //   throw new TetraAPIError(
    //     404,
    //     "Guild not found",
    //     "GUILD_NOT_FOUND_UNKNOWN_GUILD_MEMBER"
    //   );
    // }

    ApiConsole.dev.info("Fetching guild from bot...");

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
      member = await guild.members.fetch(user.discord_id);
    } catch {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_MEMBER"
      );
    }

    ApiConsole.dev.info("Parsing statistics...");

    const emotes = guild.emojis.cache.map((e) => e);
    const { emoteLimit, level } = guildParsePremium(guild);

    const animatedEmotes = emotes.filter((e) => e.animated).length;
    const staticEmotes = emotes.length - animatedEmotes;

    const stats = {
      animated: {
        used: animatedEmotes,
        limit: emoteLimit,
        free: Math.max(emoteLimit - animatedEmotes, 0),
      },
      static: {
        used: staticEmotes,
        limit: emoteLimit,
        free: Math.max(emoteLimit - staticEmotes, 0),
      },
    };

    ApiConsole.dev.info("Responding...");

    const { name, banner, icon, id } = guild;

    res.json({
      name,
      banner,
      icon,
      id,
      level,
      emotes,
      stats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    } else {
      throw error;
    }
  }
};
