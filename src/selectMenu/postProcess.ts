import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  SelectMenuInteraction,
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
import split from "../postProcess/split";

const selectEmote = {
  data: {
    name: "postProcess",
  },
  async execute(interaction: SelectMenuInteraction, client: DiscordBot) {
    const genericFeedbackManager = new FeedbackManager(interaction);
    const interactionArguments = interaction.customId.split(":");
    const [taskId, action] = interactionArguments;

    const value = interaction.values[0];

    const taskDetails = client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    const { feedback } = taskDetails;

    try {
      if (!taskDetails) {
        await feedback.interactionTimeout();
        return;
      }

      if (action === "split") {
        const splitInto = Number(value);
        await split(interaction, taskId, splitInto);
        return;
      }
    } catch (error) {
      await feedback.handleError(error);
    }
  },
};

export default selectEmote;
