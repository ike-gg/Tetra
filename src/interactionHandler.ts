import dotenv from "dotenv";
dotenv.config();

import { Interaction } from "discord.js";
import {
  DiscordBot,
  ExecutableButtonInteraction,
  ExecutableCommandInteraction,
  ExecutableSelectMenu,
} from "./types";
import { FeedbackManager } from "./utils/managers/FeedbackManager";
import errorEmbed from "./utils/embedMessages/errorEmbed";
import * as TaskTypes from "./types/TaskTypes";

const interactionHandler = async (
  interaction: Interaction,
  client: DiscordBot
) => {
  const env = process.env.env;

  if (interaction.isCommand()) {
    const command = client.commands.get(
      interaction.commandName
    ) as ExecutableCommandInteraction;

    if (!command) return;

    try {
      command.execute(interaction, client);
    } catch {
      console.error;
    }
  }

  if (interaction.isButton()) {
    const feedback = new FeedbackManager(interaction);

    const isDevCommand =
      interaction.message.interaction?.commandName.startsWith("dev");

    if (env === "development" && !isDevCommand) return;
    if (env === "production" && isDevCommand) return;

    if (!(interaction.user.id === interaction.message.interaction!.user.id)) {
      const error = errorEmbed(
        "You are not allowed **YET** to use another users interactions!"
      );
      interaction.reply({ embeds: [error], ephemeral: true });
      return;
    }

    const interactionTaskId = interaction.customId.split(":")[0];

    let taskDetails;

    if (interactionTaskId === "cancelAction") {
      taskDetails = {
        action: "cancelAction",
      };
    } else {
      taskDetails = client.tasks.getTask(interactionTaskId);
    }

    if (!taskDetails) {
      await feedback.removeButtons();
      await feedback.error("Request timed out. Create new interaction.");
      return;
    }

    const buttonInteraction = client.buttonInteractions.get(
      taskDetails.action
    ) as ExecutableButtonInteraction;

    if (!buttonInteraction) return;

    try {
      if (taskDetails.feedback) {
        buttonInteraction.execute(interaction, client);
        return;
      }
      buttonInteraction.execute(interaction, client);
    } catch {
      console.error;
    }
  }

  if (interaction.isSelectMenu()) {
    const feedback = new FeedbackManager(interaction);

    const isDevCommand =
      interaction.message.interaction?.commandName.startsWith("dev");

    if (env === "development" && !isDevCommand) return;
    if (env === "production" && isDevCommand) return;

    if (!(interaction.user.id === interaction.message.interaction!.user.id)) {
      const error = errorEmbed(
        "You are not allowed **YET** to use another users interactions!"
      );
      interaction.reply({ embeds: [error], ephemeral: true });
      return;
    }

    const taskDetails = client.tasks.getTask<TaskTypes.StealEmote>(
      interaction.customId
    );

    const { action } = taskDetails;

    if (!taskDetails) {
      await feedback.removeButtons();
      await feedback.error("Request timed out. Create new interaction.");
      return;
    }

    const selectMenuInteraction = client.selectMenu.get(
      taskDetails.action
    ) as ExecutableSelectMenu;

    if (!selectMenuInteraction) return;

    try {
      selectMenuInteraction.execute(interaction, client);
      feedback.removeButtons();
    } catch {
      console.error;
    }
  }
};

export default interactionHandler;
