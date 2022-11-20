import { ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import PPrename from "../postProcess/PPrename";
import PPtransform from "../postProcess/PPtransform";
import addEmoteToGuild from "../emotes/addEmoteToGuild";

const selectEmote = {
  data: { name: "postProcess" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);
    const interactionArguments = interaction.customId.split(":");
    const [taskId, action] = interactionArguments;

    const taskDetails =
      client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    if (action === "rename") {
      await PPrename(interaction, client, taskId);
      return;
    }

    if (action === "square" || action === "center") {
      await PPtransform(interaction, client, taskId, action);
      return;
    }

    if (action === "submit") {
      try {
        const { emote, guild, feedback } = taskDetails;
        await addEmoteToGuild(emote, guild, feedback);
      } catch (error) {
        await feedback.error(String(error));
      }
    }
  },
};

export default selectEmote;
