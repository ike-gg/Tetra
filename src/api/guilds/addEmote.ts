import { Request, Response } from "express";
import { client, discordOauth } from "../..";
import getBufferFromUrl from "../../emotes/source/getBufferFromUrl";
import { DiscordAPIError } from "discord.js";
import { PrismaClient } from "@prisma/client";

export default async (req: Request, res: Response) => {
  const accessToken = res.locals.accessToken as string;

  console.log(req.body);

  const { guildid } = req.params;
  const { emoteUrl, emoteName } = req.body as {
    emoteUrl: string;
    emoteName: string;
  };

  if (!guildid || !emoteUrl || !emoteName) {
    console.log(guildid, emoteName, emoteUrl);
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

    const emoteBuffer = await getBufferFromUrl(emoteUrl);
    const removedEmote = await guild.emojis.create({
      attachment: emoteBuffer,
      name: emoteName,
    });
    res.status(200).json({ message: `Added ${removedEmote.name} emote.` });
  } catch (e) {
    if (e instanceof DiscordAPIError && e.code === 50138) {
      const prisma = new PrismaClient();

      const webTaskExpireTime = 1000 * 60 * 30;
      const currentTime = new Date();

      const guild = await client.guilds.fetch(guildid);
      const user = await discordOauth.getUser(accessToken);

      await prisma.manualAdjustment.create({
        data: {
          emoteName,
          emoteUrl,
          expiresOn: new Date(currentTime.getTime() + webTaskExpireTime),
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.iconURL(),
          accountId: user.id,
        },
      });
      res.status(500).json({
        error:
          "Emote is too large, but Manual Adjustment task was asigned to your Panel. Check it now.",
      });
      return;
    }
    res.status(500).json({ error: String(e) });
  }
};
