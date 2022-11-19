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

  const isButtonInteraction = interaction.isButton();
  const isSelectMenuInteraction = interaction.isSelectMenu();

  if (isButtonInteraction || isSelectMenuInteraction) {
    const feedback = new FeedbackManager(interaction);

    const isDevCommand =
      interaction.message.interaction?.commandName.startsWith("dev");

    if (env === "development" && !isDevCommand) return;
    if (env === "production" && isDevCommand) return;

    if (!(interaction.user.id === interaction.message.interaction!.user.id)) {
      const error = errorEmbed(
        "You are not allowed **YET** to use another users interactions!"
      );
      interaction.reply({ embeds: [error], ephemeral: true, files: [] });
      return;
    }

    const interactionTaskId = interaction.customId.split(":")[0];

    const taskDetails = client.tasks.getTask(interactionTaskId);

    if (!taskDetails) {
      await feedback.removeButtons();
      await feedback.interactionTimeOut();
      return;
    }

    if (isButtonInteraction) {
      const buttonInteraction = client.buttonInteractions.get(
        taskDetails.action
      ) as ExecutableButtonInteraction;

      if (!buttonInteraction) return;

      try {
        buttonInteraction.execute(interaction, client);
      } catch {
        console.error;
      }
    }

    if (isSelectMenuInteraction) {
      const selectMenuInteraction = client.selectMenu.get(
        taskDetails.action
      ) as ExecutableSelectMenu;

      if (!selectMenuInteraction) return;

      try {
        selectMenuInteraction.execute(interaction, client);
        await feedback.removeButtons();
      } catch {
        console.error;
      }
    }
  }
};

export default interactionHandler;
