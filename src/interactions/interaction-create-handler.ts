import { Interaction } from "discord.js";

import { ChatInputCommandHandler, ContextMenuMessageCommandHandler } from ".";
import { isDevelopment, isProduction } from "../env";
import { ExecutableButtonInteraction, ExecutableSelectMenu, TetraClient } from "../types";
import interactionLogger from "../utils/interactionLoggers";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

export const interactionCreateHandler = async (
  interaction: Interaction,
  client: TetraClient
) => {
  if (interaction.isChatInputCommand()) {
    interactionLogger(interaction, client);

    const command = client.chatInputCommands.get(
      interaction.commandName
    ) as ChatInputCommandHandler;

    if (!command) return;

    try {
      command.handler(interaction, client);
    } catch {}
  }

  if (interaction.isMessageContextMenuCommand()) {
    const command = client.contextMenuMessageCommands.get(
      interaction.commandName
    ) as ContextMenuMessageCommandHandler;

    if (!command) return;

    try {
      command.handler(interaction, client);
    } catch {}
  }

  const isButtonInteraction = interaction.isButton();
  const isSelectMenuInteraction = interaction.isSelectMenu();

  if (isButtonInteraction || isSelectMenuInteraction) {
    const feedback = new FeedbackManager(interaction);

    const isDevCommand = interaction.message.interaction?.commandName.startsWith("dev");

    if (isDevelopment && !isDevCommand) return;
    if (isProduction && isDevCommand) return;

    const isForAll = interaction.customId.split(":")[1] === "all";

    const currentUserId = interaction.user.id;
    const originalUserId = interaction.message.interaction!.user.id;

    if (currentUserId !== originalUserId && !isForAll) {
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
    } else if (interactionTaskId === "premiumoffering") {
      taskDetails = {
        action: "premiumoffering",
      };
    } else if (interactionTaskId === "describeMedia") {
      taskDetails = {
        action: "describeMedia",
      };
    } else {
      taskDetails = client.tasks.getTask(interactionTaskId);
    }

    if (!taskDetails) {
      await feedback.removeComponents();
      await feedback.interactionTimeout();
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
