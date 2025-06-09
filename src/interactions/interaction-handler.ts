import { Interaction } from "discord.js";

import { ChatInputCommandHandler, ContextMenuMessageCommandHandler } from ".";
import { isDevelopment, isProduction } from "../env";
import { ExecutableSelectMenu, TetraClient } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { BaseContinuity } from "./continuity/base-continuity";
import { interactionLogger } from "./interaction-logger";

export const interactionHandler = async (
  interaction: Interaction,
  client: TetraClient
) => {
  if (interaction.isChatInputCommand()) {
    interactionLogger(interaction);

    const command = client.chatInputCommands.get(
      interaction.commandName
    ) as ChatInputCommandHandler;

    if (!command) return;

    try {
      command.handler(interaction, client);
    } catch {}
  }

  if (interaction.isMessageContextMenuCommand()) {
    interactionLogger(interaction);

    const command = client.contextMenuMessageCommands.get(
      interaction.commandName
    ) as ContextMenuMessageCommandHandler;

    if (!command) return;

    try {
      command.handler(interaction, client);
    } catch {}
  }

  const isContinuityInteraction =
    interaction.isButton() || interaction.isStringSelectMenu();

  if (isContinuityInteraction) {
    const feedback = new FeedbackManager(interaction);

    // TODO IMPLEMENTATION OF DEV COMMANDS

    const currentUserId = interaction.user.id;
    const originalUserId = interaction.message.interactionMetadata?.user.id;

    if (currentUserId !== originalUserId) {
      interaction.deferUpdate();
      return;
    }

    // Generic Button Interactions

    const genericButtonInteraction = client.genericButtonInteractions.get(
      interaction.customId
    );

    if (genericButtonInteraction && interaction.isButton()) {
      try {
        genericButtonInteraction.handler(interaction, client);
      } catch {
        await feedback.error("An error occurred while executing the button interaction.");
      }
    }

    // Global Button Interactions

    const continuityInteraction = BaseContinuity.decodeButtonId(interaction.customId);

    const globalButtonInteraction = client.globalButtonInteractions.get(
      continuityInteraction.name
    );

    if (
      globalButtonInteraction &&
      globalButtonInteraction.handler &&
      interaction.isButton()
    ) {
      try {
        const data = await globalButtonInteraction.getContext(continuityInteraction.id);
        globalButtonInteraction.handler({ client, interaction, data });
      } catch (error) {
        await feedback.handleError(error);
      }
    }
  }

  const isButtonInteraction = interaction.isButton();
  const isSelectMenuInteraction = interaction.isStringSelectMenu();

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

    // if (isButtonInteraction) {
    //   const buttonInteraction = client.buttonInteractions.get(
    //     taskDetails.action
    //   ) as ExecutableButtonInteraction;

    //   if (!buttonInteraction) return;

    //   try {
    //     buttonInteraction.execute(interaction, client);
    //   } catch {
    //     console.error;
    //   }
    // }

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
