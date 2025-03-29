import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  SelectMenuInteraction,
} from "discord.js";

import addEmoteToGuild from "../emotes/addEmoteToGuild";
import editEmoteByUser from "../emotes/editEmoteByUser";
import emoteOptimise from "../emotes/emoteOptimise";
import removebg from "../postProcess/removebg";
import rename from "../postProcess/rename";
import split from "../postProcess/split";
import transform from "../postProcess/transform";
import { TetraClient } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import { parseEntitlementsData } from "../utils/discord/parseEntitlementsData";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";

const selectEmote = {
  data: {
    name: "postProcess",
  },
  async execute(interaction: SelectMenuInteraction, client: TetraClient) {
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
