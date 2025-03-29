import { Events } from "discord.js";

import { interactionCreateHandler as handler } from "@/interactions/interaction-create-handler";

import { EventHandler } from ".";
import { internalClient } from "../bot";

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
  const isSelectMenu = interaction.isSelectMenu();
  const isAutocomplete = interaction.isAutocomplete();

  const supportedInteraction = isCommand || isButton || isSelectMenu || isAutocomplete;

  if (supportedInteraction) {
    try {
      handler(interaction, internalClient);
    } catch (error) {
      console.error("Failed to handle interaction: ", error);
    }
  }
};
