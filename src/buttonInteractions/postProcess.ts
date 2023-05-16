import { ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import rename from "../postProcess/rename";
import transform from "../postProcess/transform";
import addEmoteToGuild from "../emotes/addEmoteToGuild";
import interactionLogger, { manualLogger } from "../utils/interactionLoggers";
import emoteOptimise from "../emotes/emoteOptimise";
import editEmoteByUser from "../emotes/editEmoteByUser";
import TaskManager from "../utils/managers/TaskManager";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const selectEmote = {
  data: { name: "postProcess" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const genericFeedbackManager = new FeedbackManager(interaction);
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
        await rename(interaction, taskId);
        return;
      }

      if (action === "square" || action === "center") {
        await transform(interaction, client, taskId, action);
        return;
      }

      if (action === "submit") {
        try {
          await addEmoteToGuild(taskId);
        } catch (error) {
          await feedback.error(String(error));
        }
      }

      if (action === "auto") {
        await genericFeedbackManager.removeButtons();
        const { emote } = taskDetails;
        const optimisedEmote = await emoteOptimise(emote.finalData, {
          animated: emote.animated,
          feedback: feedback,
        });
        client.tasks.updateTask<TaskTypes.PostProcessEmote>(taskId, {
          ...taskDetails,
          emote: {
            ...taskDetails.emote,
            finalData: optimisedEmote,
          },
        });
        await editEmoteByUser(taskId);
      }

      if (action === "manual") {
        const { id: userId, username } = interaction.user;
        manualLogger(`user (${userId}) ${username} used manual adjustment!`);

        TaskManager.getInstance().webAccess(taskId);
        try {
          await feedback.manualAdjustment();
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
