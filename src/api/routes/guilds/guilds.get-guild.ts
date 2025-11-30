import { APIEmoji, APIGuild } from "discord.js";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { discordRestApi } from "@/lib/discord-rest-api";

import { basicGuildParsePremium } from "../../../utils/discord/guildParsePremium";
import { TetraAPIError } from "../../TetraAPIError";

const getGuildQuerySchema = z.object({
  guildId: z.string(),
});

export const guildsGetGuild = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { guildId } = getGuildQuerySchema.parse(req.params);

    const promises = [
      discordRestApi.guilds.get(guildId),
      discordRestApi.guilds.getMember(guildId, req.user!.id),
      discordRestApi.guilds.getEmojis(guildId),
    ];

    const [guildPromise, memberPromise, emotesPromise] =
      await Promise.allSettled(promises);

    if (guildPromise.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT"
      );
    }

    if (memberPromise.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_MEMBER"
      );
    }

    if (emotesPromise.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_EMOTES"
      );
    }

    const guild = guildPromise.value as APIGuild;
    const emotes = emotesPromise.value as APIEmoji[];

    const { emoteLimit, level } = basicGuildParsePremium(guild);

    const emoteAnimated = emotes.filter((e) => e.animated).length;
    const emoteStatic = emotes.filter((e) => !e.animated).length;

    const stats = {
      animated: {
        used: emoteAnimated,
        limit: emoteLimit,
        free: Math.max(emoteLimit - emoteAnimated, 0),
      },
      static: {
        used: emoteStatic,
        limit: emoteLimit,
        free: Math.max(emoteLimit - emoteStatic, 0),
      },
    };

    const { name, banner, icon, id } = guild;

    const mappedEmotes = emotes.map((e) => {
      const { id, animated, name, managed, available } = e;

      return {
        id,
        animated,
        name,
        guildId: guild.id,
        imageURL: `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`,
        managed,
        available,
      };
    });

    res.json({
      name,
      banner,
      icon,
      id,
      level,
      emotes: mappedEmotes,
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
