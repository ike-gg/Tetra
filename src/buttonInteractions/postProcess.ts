import { ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import rename from "../postProcess/rename";
import transform from "../postProcess/transform";
import addEmoteToGuild from "../emotes/addEmoteToGuild";

const selectEmote = {
  data: { name: "postProcess" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const interactionArguments = interaction.customId.split(":");
    const [taskId, action] = interactionArguments;

    try {
      const taskDetails =
        client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

      const { feedback } = taskDetails;

      if (!taskDetails) {
        await feedback.interactionTimeOut();
        return;
      }

      if (action === "rename") {
        await rename(interaction, client, taskId);
        return;
      }

      if (action === "square" || action === "center") {
        await transform(interaction, client, taskId, action);
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
    } catch (error) {
      console.error(error);
    }
  },
};

export default selectEmote;
