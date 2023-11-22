import { NextFunction, Request, Response } from "express";
import { client, discordOauth } from "../..";
import { TetraAPIError } from "../TetraAPIError";

export default async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = res.locals.accessToken as string;
  const guildid = req.params.guildid;

  if (!guildid) throw new TetraAPIError(400, "Bad request.");

  try {
    const userGuilds = await discordOauth.getUserGuilds(accessToken);

    const isUserInGuild = userGuilds.some((guild) => guild.id === guildid);

    if (!isUserInGuild) throw new TetraAPIError(401, "Not authorized.");

    const guild = await client.guilds.fetch(guildid);

    if (!guild) throw new TetraAPIError(400, "Guild not found.");

    const emotes = guild.emojis.cache.map((e) => e);

    const { name, banner, icon } = guild;

    res.status(200).json({ emotes, name, icon, banner });
  } catch (e) {
    next(e);
  }
};
