import { Request, Response } from "express";
import { client } from "../../index";
import TaskManager from "../../utils/managers/TaskManager";
import { TextChannel } from "discord.js";

export default async (req: Request, res: Response) => {
  const { guildId, emote, name, taskId } = req.body;
  const userId = res.locals.userId;

  console.log(req.body);

  if (!guildId || !emote || !name || !taskId) {
    res.status(400).json({ error: "Request missing required data." });
    return;
  }

  const tasks = TaskManager.getInstance();

  const isVerified = tasks.verify(taskId, guildId, userId);

  if (!isVerified) {
    res.status(401).json({ error: "Task cant be verified." });
    return;
  }

  const emoteBuffer = Buffer.from(emote);

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
    res.json({ error: String(e) });
  }
};
