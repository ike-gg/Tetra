import { Request, Response } from "express";
import { client, discordOauth } from "../..";

export default async (req: Request, res: Response) => {
  const accessToken = res.locals.accessToken as string;

  const { guildid, emoteid } = req.params;

  if (!guildid || !emoteid) {
    res.status(400).json({ error: "Bad request." });
    return;
  }

  try {
    const user = await discordOauth.getUser(accessToken);

    if (!user) {
      res.status(401).json({ error: "Not authorized." });
      return;
    }

    const guild = await client.guilds.fetch(guildid);

    if (!guild) {
      res.status(403).json({ error: "Forbidden." });
      return;
    }

    const userInGuild = await guild.members.fetch(user.id);

    if (!userInGuild) {
      res.status(401).json({ error: "Not authorized." });
      return;
    }

    const hasPermissions = userInGuild.permissions.has(
      "ManageEmojisAndStickers"
    );

    if (!hasPermissions) {
      res.status(401).json({ error: "Not authorized." });
      return;
    }

    const emoteInGuild = await guild.emojis.fetch(emoteid);

    if (!emoteInGuild) {
      res.status(400).json({ error: "Bad request." });
      return;
    }

    const removedEmote = await emoteInGuild.delete();
    res.status(200).json({ message: `Removed ${removedEmote.name} emote.` });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
