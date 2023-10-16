import { Guild } from "discord.js";
import { ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";
import { Messages } from "../constants/messages";

const addEmoteToGuild = async (taskId: string) => {
  const taskDetails =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  const { feedback, emote, guild } = taskDetails;

  try {
    await feedback.removeComponents();
    const addedEmote = await guild.emojis.create({
      attachment: emote.finalData,
      name: emote.name,
    });
    await feedback.success(Messages.ADDED_EMOTE(addedEmote));
    await feedback.logsOfUses(addedEmote);
  } catch (error) {
    throw new Error(String(error));
  }
};

export default addEmoteToGuild;
