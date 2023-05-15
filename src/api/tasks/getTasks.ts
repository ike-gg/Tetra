import { Request, Response } from "express";
import TaskManager from "../../utils/managers/TaskManager";
import * as TaskTypes from "../../types/TaskTypes";

export default async (req: Request, res: Response) => {
  const tasks = TaskManager.getInstance().getUserTasks(res.locals.userId);

  const manualAdjustmentTasks = tasks.filter(
    (task) => task.action === "postProcess"
  ) as TaskTypes.PostProcessEmote[];

  const userTasks = manualAdjustmentTasks.map((task) => {
    const { id, emote, guild } = task;
    const { name: guildName, icon: guildIcon } = guild;
    const { animated, name, origin } = emote;
    const { preview } = emote.file;
    return {
      id,
      emote: {
        preview,
        animated,
        name,
        origin,
      },
      guildName,
      guildIcon,
    };
  });

  res.json(userTasks);
};
