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
import interactionLogger from "./utils/interactionLoggers";
import { BANNEDLIST } from "./bannedusers";
import { TetraEmbed } from "./utils/embedMessages/TetraEmbed";

const interactionHandler = async (
  interaction: Interaction,
  client: DiscordBot
) => {
  const env = process.env.env;

  const banDetails = BANNEDLIST.find(
    (bannedUser) => bannedUser.userId === interaction.user.id
  );

  if (banDetails) {
    if (!interaction.isRepliable() || !interaction.isChatInputCommand()) {
      return;
    }
    interaction.reply({
      embeds: [
        TetraEmbed.error({
          title: "Banned",
          description: `Reason: ${banDetails.reason || "-"}`,
        }),
      ],
    });
    return;
  }

  if (interaction.isCommand()) {
    console.log(
      `New interaction: user: ${interaction.user.username}, guild: ${interaction.guild?.name}, command: ${interaction.commandName}`
    );

    interactionLogger(interaction, client);

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
      interaction.deferUpdate();
      return;
    }

    const interactionTaskId = interaction.customId.split(":")[0];

    let taskDetails;

    if (interactionTaskId === "cancelAction") {
      taskDetails = {
        action: "cancelAction",
      };
    } else if (interactionTaskId === "errorlog") {
      taskDetails = {
        action: "errorLog",
      };
    } else {
      taskDetails = client.tasks.getTask(interactionTaskId);
    }

    if (!taskDetails) {
      await feedback.removeComponents();
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
        await feedback.removeComponents();
      } catch {
        console.error;
      }
    }
  }
};

export default interactionHandler;
