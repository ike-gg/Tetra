import { SelectMenuInteraction } from "discord.js";

import prepareEmote from "../emotes/prepareEmote";
import { TetraClient } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const stealEmote = {
  data: {
    name: "stealEmote",
  },
  async execute(interaction: SelectMenuInteraction, client: TetraClient) {
    const feedback = new FeedbackManager(interaction, {
      ephemeral: true,
    });

    await feedback.removeComponents();
    await feedback.working();

    const guildId = interaction.values[0];
    const guild = await client.guilds.fetch(guildId);

    if (!guild) {
      feedback.error({
        description: "Cant access this guild.",
      });
      return;
    }

    const taskId = interaction.customId;
    const taskDetails = client.tasks.getTask<TaskTypes.StealEmote>(taskId);
    const { emote } = taskDetails;

    prepareEmote(emote, {
      feedback,
      interaction,
      guild,
    });
  },
};

export default stealEmote;
