import { Request, Response } from "express";
import { client } from "../../index";
import TaskManager from "../../utils/managers/TaskManager";
import { TextChannel } from "discord.js";

export default async (req: Request, res: Response) => {
  const { guildId, emote, name, taskId } = req.body;

  console.log(req.body);

  if (!guildId || !emote || !name || !taskId) {
    res.sendStatus(400);
    return;
  }

  const tasks = TaskManager.getInstance();

  const isVerified = tasks.verify(taskId, guildId);

  if (!isVerified) {
    res.sendStatus(401);
    return;
  }

  const emoteBuffer = Buffer.from(emote);
  console.log(emoteBuffer.byteLength);
  try {
    const emote = await client.guilds.cache
      .get(guildId)
      ?.emojis.create({ attachment: emoteBuffer, name: name });

    tasks.removeTask(taskId);

    try {
      const announceChannel = (await client.channels.fetch(
        "1054273914437648384"
      )) as TextChannel;

      if (!announceChannel) return;

      await announceChannel.send(
        `> Someone just added an emote ${emote} to their server using **Manual Adjustment**! ${
          Math.random() > 0.8
            ? `\nTry to use \`steal\` command on this message to add emote to your server!`
            : ""
        }`
      );
    } catch (error) {
      console.error("Cant reach announcement channel");
    }

    res.status(200).json({
      message: "Emote created",
      emote,
    });
  } catch (e) {
    res.status(500);
    res.json({ message: String(e) });
  }
};
