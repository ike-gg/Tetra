import { Request, Response } from "express";
import { client, discordOauth } from "../..";
import { PrismaClient } from "@prisma/client";

export default async (req: Request, res: Response) => {
  const accessToken = res.locals.accessToken as string;
  const taskId = req.params.taskid;

  if (!taskId) {
    res.status(400).json({ error: "Bad request" });
    return;
  }

  const prisma = new PrismaClient();
  const taskDetails = await prisma.manualAdjustment.findFirst({
    where: { id: taskId },
  });

  if (!taskDetails) {
    res.status(400).json({ error: "Bad request" });
    return;
  }

  const { accountId, emoteName, guildId } = taskDetails;

  const currentUser = await discordOauth.getUser(accessToken);

  if (currentUser.id !== accountId) {
    res.status(401).json({ error: "Not authorized." });
    return;
  }

  const emoteBase64 = req.body.emote as string;

  if (!emoteBase64) {
    res.status(400).json({ error: "Emote missing." });
    return;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    const addedEmote = await guild.emojis.create({
      attachment: emoteBase64,
      name: emoteName,
    });
    await prisma.manualAdjustment.delete({ where: { id: taskId } });
    res
      .status(200)
      .json({ message: `Sucessfully added ${addedEmote.name} emote.` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
    return;
  } finally {
    await prisma.$disconnect();
  }
};
