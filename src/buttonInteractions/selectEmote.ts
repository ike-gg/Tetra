import { ButtonInteraction } from "discord.js";

import prepareEmote from "../emotes/prepareEmote";
import { TetraClient } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const selectEmote = {
  data: {
    name: "selectEmote",
  },
  async execute(interaction: ButtonInteraction, client: TetraClient) {
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
