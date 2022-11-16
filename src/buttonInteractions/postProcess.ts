import { ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import PPrename from "../postProcess/PPrename";

const selectEmote = {
  data: { name: "postProcess" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction, { alredyReplied: true });

    const interactionArguments = interaction.customId.split(":");
    const [taskId, action] = interactionArguments;

    const taskDetails =
      client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    if (action === "rename") {
      await PPrename(interaction, client, {
        feedback,
        emote: taskDetails.emoteGuild,
      });
      return;
    }
  },
};

export default selectEmote;
