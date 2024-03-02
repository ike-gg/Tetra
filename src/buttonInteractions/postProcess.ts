import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
} from "discord.js";

import { DiscordBot } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import rename from "../postProcess/rename";
import transform from "../postProcess/transform";
import addEmoteToGuild from "../emotes/addEmoteToGuild";
import emoteOptimise from "../emotes/emoteOptimise";
import editEmoteByUser from "../emotes/editEmoteByUser";
import TaskManager from "../utils/managers/TaskManager";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { parseEntitlementsData } from "../utils/discord/parseEntitlementsData";
import removebg from "../postProcess/removebg";

const selectEmote = {
  data: { name: "postProcess" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const genericFeedbackManager = new FeedbackManager(interaction);
    const interactionArguments = interaction.customId.split(":");
    const [taskId, action] = interactionArguments;

    const taskDetails =
      client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    const { feedback } = taskDetails;

    try {
      if (!taskDetails) {
        await feedback.interactionTimeout();
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

      if (action === "removebg") {
        const { hasPremium } = parseEntitlementsData(interaction);
        if (!hasPremium) {
          await interaction.sendPremiumRequired();
          return;
        }
        await removebg(interaction, client, taskId);
      }

      if (action === "submit") {
        await addEmoteToGuild(taskId);
      }

      if (action === "auto") {
        await genericFeedbackManager.removeComponents();
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
        interaction.deferUpdate();

        try {
          const newTaskId = await TaskManager.getInstance().webAccess(taskId);

          await feedback.removeComponents();

          if (!newTaskId) {
            await feedback.panel("Manual adjustment available on Panel.");
            return;
          }
          await feedback.sendMessage({
            content: `https://panel.tetra.lol/r/${newTaskId}`,
            embeds: [],
          });
        } catch (error) {
          await feedback.handleError(error);
        }
      }
    } catch (error) {
      await feedback.handleError(error);
    }
  },
};

export default selectEmote;
