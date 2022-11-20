import { Guild, GuildEmoji } from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import getPostProcessRow from "../utils/elements/getPostProcessRow";
import getSubmitEmoteRow from "../utils/elements/getSubmitEmoteRow";

const editEmoteByUser = async (
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
  let { data, name } = emote;

  emote.name = emote.name.slice(0, 28);

  console.log(emote.name);
  console.log(name);

  let isRateLimited: NodeJS.Timeout | undefined;
  try {
    // isRateLimited = setTimeout(async () => {
    //   await feedback.rateLimited();
    // }, 7500);

    // const addedEmote = await guild.emojis.create({
    //   attachment: image,
    //   name: name.slice(0, 25),
    // });

    // clearTimeout(isRateLimited);

    // await feedback.successedAddedEmote(addedEmote);
    const taskId = client.tasks.addTask<TaskTypes.PostProcessEmote>({
      action: "postProcess",
      emote,
      feedback,
      guild,
    });

    const postProcessRow = getPostProcessRow(taskId, emote.origin, {
      isEmoteAnimated: emote.animated,
      origin,
    });

    const submitRow = getSubmitEmoteRow(taskId, emote.name);

    await feedback.editEmoteByUser(emote, emote.finalData);
    await feedback.updateComponents([postProcessRow, submitRow]);
  } catch (error) {
    if (isRateLimited) clearTimeout(isRateLimited);
    await feedback.error(String(error));
  }
};

export default editEmoteByUser;
