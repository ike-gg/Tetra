import { ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import PPrename from "../postProcess/PPrename";
import PPtransform from "../postProcess/PPtransform";

const selectEmote = {
  data: { name: "postProcess" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);
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

    if (action === "square" || action === "center") {
      await PPtransform(interaction, client, {
        feedback,
        taskId,
        transform: action,
      });
      return;
    }
  },
};

export default selectEmote;
