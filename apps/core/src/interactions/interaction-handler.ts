import { type Interaction, MessageFlags } from "discord.js";

import { Messages } from "@/constants/messages";
import { TetraEmbed } from "@/utils/embed-messages/tetra-embed";

import type { TetraClient } from "../types";
import { FeedbackManager } from "../utils/managers/feedback-manager";
import type { ChatInputCommandHandler, ContextMenuMessageCommandHandler } from ".";
import { BaseContinuity } from "./continuity/base-continuity";
import { interactionLogger } from "./interaction-logger";

import { BotConsole } from "#/loggers";

export const interactionHandler = async (
  interaction: Interaction,
  client: TetraClient
) => {
  if (interaction.isChatInputCommand()) {
    void interactionLogger(interaction);

    const command = client.chatInputCommands.get(
      interaction.commandName
    ) as ChatInputCommandHandler;

    if (!command) return;

    try {
      await command.handler(interaction, client);
    } catch (error) {
      await new FeedbackManager(interaction).handleError(error);
    }
  }

  if (interaction.isMessageContextMenuCommand()) {
    void interactionLogger(interaction);

    const command = client.contextMenuMessageCommands.get(
      interaction.commandName
    ) as ContextMenuMessageCommandHandler;

    if (!command) return;

    try {
      await command.handler(interaction, client);
    } catch (error) {
      await new FeedbackManager(interaction).handleError(error);
    }
  }

  const isContinuityInteraction =
    interaction.isButton() || interaction.isStringSelectMenu();

  if (isContinuityInteraction) {
    const feedback = new FeedbackManager(interaction);

    const currentUserId = interaction.user.id;
    const originalUserId = interaction.message.interactionMetadata?.user.id;

    if (currentUserId !== originalUserId) {
      await interaction.deferUpdate();
      return;
    }

    // Generic Button Interactions

    const genericButtonInteraction = client.genericButtonInteractions.get(
      interaction.customId
    );

    if (genericButtonInteraction && interaction.isButton()) {
      try {
        await genericButtonInteraction.handler(interaction, client);
      } catch (error) {
        BotConsole.error(
          `Generic button "${interaction.customId}" failed (user ${interaction.user.id}):`,
          error
        );
        await feedback.handleError(error);
      }
      return;
    }

    // Global Button Interactions

    const continuityInteraction = BaseContinuity.decodeButtonId(interaction.customId);

    const globalButtonInteraction = client.globalButtonInteractions.get(
      continuityInteraction.name
    );

    if (globalButtonInteraction?.handler && interaction.isButton()) {
      try {
        const data = await globalButtonInteraction.getContext(continuityInteraction.id);
        await globalButtonInteraction.handler({ client, interaction, data });
      } catch (error) {
        await feedback.handleError(error);
      }
      return;
    }

    // Global Select Menu Interactions

    const globalSelectMenuInteraction = client.globalSelectMenuInteractions.get(
      continuityInteraction.name
    );

    if (globalSelectMenuInteraction?.handler && interaction.isStringSelectMenu()) {
      try {
        const data = await globalSelectMenuInteraction.getContext(
          continuityInteraction.id
        );
        await globalSelectMenuInteraction.handler({ client, interaction, data });
      } catch (error) {
        await feedback.handleError(error);
      }
      return;
    }

    // No handler: usually an old message whose button was renamed or removed
    BotConsole.dev.warn(
      `No handler for component "${interaction.customId}" (user ${interaction.user.id}).`
    );

    await interaction.reply({
      embeds: [TetraEmbed.error(Messages.INTERACTION_TIMEOUT)],
      flags: MessageFlags.Ephemeral,
    });
  }
};
