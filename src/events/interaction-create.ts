import { Events } from "discord.js";

import { interactionHandler } from "@/interactions/interaction-handler";

import { EventHandler } from ".";
import { internalClient } from "../bot";

import { BotConsole } from "#/loggers";

export const interactionCreateHandler: EventHandler<Events.InteractionCreate> = async (
  interaction
) => {
  const inGuild = interaction.inGuild();

  if (!inGuild) {
    if (!interaction.isRepliable()) return;
    interaction.reply("This command can only be used in a server.");
    return;
  }

  const isCommand = interaction.isCommand();
  const isButton = interaction.isButton();
  const isSelectMenu = interaction.isStringSelectMenu();
  const isAutocomplete = interaction.isAutocomplete();

  const supportedInteraction = isCommand || isButton || isSelectMenu || isAutocomplete;

  if (supportedInteraction) {
    try {
      interactionHandler(interaction, internalClient);
    } catch (error) {
      BotConsole.error("Failed to handle interaction:", error);
    }
  }
};
