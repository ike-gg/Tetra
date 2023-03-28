import { Request, Response } from "express";
import { client } from "../../index";
import TaskManager from "../../utils/managers/TaskManager";

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

    res.status(200).json({
      message: "Emote created",
      emote,
    });
  } catch (e) {
    res.status(500);
    res.json({ message: String(e) });
  }
};
