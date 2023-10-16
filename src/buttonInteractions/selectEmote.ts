import { ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import prepareEmote from "../emotes/prepareEmote";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);

    const taskId = interaction.customId;

    const taskDetails = client.tasks.getTask<TaskTypes.EmotePicker>(taskId);

    const { emote } = taskDetails;

    await feedback.removeComponents();
    await feedback.working();

    prepareEmote(emote, {
      feedback,
      interaction,
    });
  },
};

export default selectEmote;
