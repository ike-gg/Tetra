import { Request, Response } from "express";
import sharp from "sharp";
import { PostProcessEmote } from "../../types/TaskTypes";
import TaskManager from "../../utils/managers/TaskManager";

export default async (req: Request, res: Response) => {
  if (!req.params.id) {
    res.status(400).json({ error: "Missing id." });
    return;
  }

  const taskId = String(req.params.id);
  const userId = res.locals.userId;

  const userTasks = TaskManager.getInstance().getUserTasks(userId);

  const taskDetails = userTasks.find((task) => task.id === taskId) as
    | PostProcessEmote
    | undefined;

  if (!taskDetails) {
    res
      .status(404)
      .json({ error: "Task not found, or user might not be authorised." });
    return;
  }

  if (taskDetails.action !== "postProcess") {
    res
      .status(400)
      .json({ error: "This type of task is not supported via browser" });
    return;
  }

  const { emote, guild, id, interaction } = taskDetails;
  const { name, icon, id: guildId } = guild;

  const { pages, delay } = await sharp(emote.data, {
    animated: true,
  }).metadata();

  let interactionDetails = {};

  if (interaction) {
    const { channel, channelId, id, user } = interaction;
    interactionDetails = {
      channel,
      channelId,
      id,
      user,
    };
  }

  const responseData = {
    emote: {
      ...emote,
      pages,
      delay,
    },
    guild: {
      name,
      icon: `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`,
      id: guildId,
    },
    taskId: id,
    interaction: interactionDetails,
  };

  res.json(responseData);
};
