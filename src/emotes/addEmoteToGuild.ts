import { Guild } from "discord.js";
import { ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";

const addEmoteToGuild = async (taskId: string) => {
  const taskDetails =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  const { feedback, emote, guild } = taskDetails;

  try {
    await feedback.removeButtons();
    const addedEmote = await guild.emojis.create({
      attachment: emote.finalData,
      name: emote.name,
    });
    await feedback.successedAddedEmote(addedEmote);
    await feedback.logsOfUses(addedEmote);
  } catch (error) {
    throw new Error(String(error));
  }
};

export default addEmoteToGuild;
