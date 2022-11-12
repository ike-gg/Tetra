import { ButtonInteraction } from "discord.js";

import emote7tv from "../emotes/emote7tv";
import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);

    const taskId = interaction.customId;
    const taskDetails = client.tasks.getTask<TaskTypes.EmotePicker>(taskId);
    const emoteReference = taskDetails.emoteReference;

    await feedback.removeButtons();
    await feedback.gotRequest();

    try {
      const emote = await emote7tv(emoteReference, feedback);

      const addedEmote = await interaction.guild?.emojis.create({
        attachment: emote.image,
        name: emote.name,
      });

      await feedback.success(
        `Success!`,
        `Successfully added \`${addedEmote?.name}\` emote! ${addedEmote}`,
        emote.preview
      );
    } catch (error: any) {
      feedback.error(String(error));
    }
  },
};

export default selectEmote;
