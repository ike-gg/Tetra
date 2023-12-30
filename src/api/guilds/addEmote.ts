import { NextFunction, Request, Response } from "express";
import { client, discordOauth } from "../..";
import getBufferFromUrl from "../../emotes/source/getBufferFromUrl";
import { DiscordAPIError } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { TetraAPIError } from "../TetraAPIError";
import { announceUse } from "../../utils/managers/FeedbackManager";
import { Messages } from "../../constants/messages";

export default async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = res.locals.accessToken as string;

  const { guildid } = req.params;
  const { emoteUrl, emoteName } = req.body as {
    emoteUrl: string;
    emoteName: string;
  };

  if (!guildid || !emoteUrl || !emoteName)
    throw new TetraAPIError(400, "Bad request.");

  try {
    const user = await discordOauth.getUser(accessToken);

    if (!user) throw new TetraAPIError(401, "Not authorized.");

    const guild = await client.guilds.fetch(guildid);

    const userInGuild = await guild.members.fetch(user.id);

    if (!userInGuild)
      throw new TetraAPIError(401, "Not authorized. Not found user in guild.");

    const hasPermissions = userInGuild.permissions.has(
      "ManageEmojisAndStickers"
    );

    if (!hasPermissions)
      throw new TetraAPIError(
        401,
        "Not authorized. Missing permissions in guild."
      );

    const emoteBuffer = await getBufferFromUrl(emoteUrl);
    const addedEmote = await guild.emojis.create({
      attachment: emoteBuffer,
      name: emoteName,
    });
    res
      .status(200)
      .json({ message: `Added ${addedEmote.name} emote to ${guild.name}` });

    await announceUse(Messages.ANNOUNCE_ADDED_EMOTE_PANEL(addedEmote));
  } catch (e) {
    if (e instanceof DiscordAPIError && e.code === 50138) {
      const prisma = new PrismaClient();

      const webTaskExpireTime = 1000 * 60 * 30;
      const currentTime = new Date();

      const guild = await client.guilds.fetch(guildid);
      const user = await discordOauth.getUser(accessToken);

      const { id } = await prisma.manualAdjustment.create({
        data: {
          emoteName,
          emoteUrl,
          expiresOn: new Date(currentTime.getTime() + webTaskExpireTime),
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.icon,
          accountId: user.id,
        },
      });
      await prisma.$disconnect();
      res.status(301).json({
        message:
          "Emote has exceeded the file limit. Manual adjustment has been created.",
        taskId: id,
      });
      return;
    } else {
      next(e);
    }
  }
};
