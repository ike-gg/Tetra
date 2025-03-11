import { NextFunction, Request, Response } from "express";
import { client, discordOauth } from "../../..";
import { TetraAPIError } from "../TetraAPIError";
import { guildParsePremium } from "../../utils/discord/guildParsePremium";

export default async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = res.locals.accessToken as string;
  const guildid = req.params.guildid;

  if (!guildid) next(new TetraAPIError(400, "Bad request."));

  try {
    const userGuilds = await discordOauth.getUserGuilds(accessToken);

    const isUserInGuild = userGuilds.some((guild) => guild.id === guildid);

    if (!isUserInGuild) throw new TetraAPIError(401, "Not authorized.");

    const guild = await client.guilds.fetch(guildid);

    if (!guild) throw new TetraAPIError(400, "Guild not found.");

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

    const { name, banner, icon } = guild;

    res.status(200).json({
      emotes,
      name,
      icon,
      banner,
      stats,
      level,
    });
  } catch (e) {
    next(e);
  }
};
