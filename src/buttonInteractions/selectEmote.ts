import { ButtonInteraction } from "discord.js";

import emote7tv from "../emotes/emote7tv";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import editEmoteByUser from "../emotes/editEmoteByUser";
import getRawEmote from "../api/discord/getRawEmote";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);

    const taskId = interaction.customId;

    const taskDetails = client.tasks.getTask<TaskTypes.EmotePicker>(taskId);
    const { emoteReference, origin } = taskDetails;

    await feedback.removeButtons();
    await feedback.gotRequest();

    try {
      let emote: ExtractedEmote;
      if (origin === "7tv") {
        emote = await emote7tv(emoteReference, feedback);
      }
      if (origin === "twitch") {
        const rawEmote = await getRawEmote(taskDetails.url!);
        const emoteFile = Buffer.from(rawEmote!);
        emote = {
          animated: taskDetails.animated!,
          data: emoteFile,
          finalData: emoteFile,
          name: taskDetails.name!,
          origin: "twitch",
          preview: taskDetails.preview!,
        };
      }
      if (origin === "discord") {
        const rawEmote = await getRawEmote(taskDetails.url!);
        const emoteFile = Buffer.from(rawEmote);
        emote = {
          animated: taskDetails.animated!,
          data: emoteFile,
          finalData: emoteFile,
          name: taskDetails.name!,
          origin: "discord",
          preview: taskDetails.preview!,
        };
      }
      await editEmoteByUser(emote!, interaction.guild!, {
        client,
        feedback,
        interaction,
      });
    } catch (error) {
      feedback.error(String(error));
    }
  },
};

export default selectEmote;
