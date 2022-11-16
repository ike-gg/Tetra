import { Guild, GuildEmoji } from "discord.js";
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
    origin?: "postProcess";
  }
) => {
  let origin: "postProcess" | undefined;
  if (options.origin === "postProcess") origin = "postProcess";
  const { feedback, client } = options;
  const { image, name } = emote;
  try {
    const isRateLimited = setTimeout(() => {
      feedback.rateLimited();
    }, 5000);

    const addedEmote = await guild.emojis.create({
      attachment: image,
      name: name,
    });

    clearTimeout(isRateLimited);
    await feedback.successedAddedEmote(addedEmote);
    const taskId = client.tasks.addTask<TaskTypes.PostProcessEmote>({
      action: "postProcess",
      emote,
      emoteGuild: addedEmote,
    });
    const postProcessRow = getPostProcessRow(taskId, {
      isEmoteAnimated: emote.animated,
      origin,
    });
    await feedback.updateComponents([postProcessRow]);
  } catch (error) {
    await feedback.error(String(error));
  }
};

export default emoteToGuild;
