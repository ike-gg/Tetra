import { Request, Response } from "express";
import { client, discordOauth } from "../..";

export default async (req: Request, res: Response) => {
  const accessToken = res.locals.accessToken as string;
  const guildid = req.params.guildid;

  if (!guildid) {
    res.status(400).json({ error: "Bad request" });
    return;
  }

  try {
    const userGuilds = await discordOauth.getUserGuilds(accessToken);

    const isUserInGuild = userGuilds.some((guild) => guild.id === guildid);

    if (!isUserInGuild) {
      res.status(401).json({ error: "Not authorized." });
      return;
    }

    const guild = await client.guilds.fetch(guildid);

    if (!guild) {
      res.status(400).json({ error: "Guild not found" });
      return;
    }

    const emotes = guild.emojis.cache.map((e) => e);

    const { name, banner, icon } = guild;

    res.status(200).json({ emotes, name, icon, banner });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
