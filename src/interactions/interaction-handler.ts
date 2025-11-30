import { Interaction } from "discord.js";

import { ChatInputCommandHandler, ContextMenuMessageCommandHandler } from ".";
import { TetraClient } from "../types";
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
        await genericButtonInteraction.handler(interaction, client);
      } catch {
        await feedback.error("An error occurred while executing the button interaction.");
      }
      return;
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
        await globalButtonInteraction.handler({ client, interaction, data });
      } catch (error) {
        await feedback.handleError(error);
      }
    }

    // Global Select Menu Interactions

    const globalSelectMenuInteraction = client.globalSelectMenuInteractions.get(
      continuityInteraction.name
    );

    if (
      globalSelectMenuInteraction &&
      globalSelectMenuInteraction.handler &&
      interaction.isStringSelectMenu()
    ) {
      try {
        const data = await globalSelectMenuInteraction.getContext(
          continuityInteraction.id
        );
        await globalSelectMenuInteraction.handler({ client, interaction, data });
      } catch (error) {
        await feedback.handleError(error);
      }
    }
  }
};
