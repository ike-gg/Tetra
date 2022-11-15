import { Guild } from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import getPostProcessRow from "../utils/elements/getPostProcessRow";

const emoteToGuild = async (
  emote: ExtractedEmote,
  guild: Guild,
  options: {
    client: DiscordBot;
    feedback: FeedbackManager;
  }
) => {
  const { feedback, client } = options;
  const { image, name } = emote;
  try {
    const addedEmote = await guild.emojis.create({
      attachment: image,
      name: name,
    });
    await feedback.successedAddedEmote(addedEmote);
    const taskId = client.tasks.addTask<TaskTypes.PostProcessEmote>({
      action: "postProcess",
      emote,
      emoteGuild: addedEmote,
    });
    const postProcessRow = getPostProcessRow(taskId);
    await feedback.updateComponents([postProcessRow]);
  } catch (error) {
    await feedback.error(String(error));
  }
};

export default emoteToGuild;
