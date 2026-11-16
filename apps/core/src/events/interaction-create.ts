import { type Events, type Interaction, InteractionContextType } from "discord.js";

import { interactionHandler } from "@/interactions/interaction-handler";
import type { TetraClient } from "@/types";

import { internalClient } from "../bot";
import type { EventHandler } from ".";

import { BotConsole } from "#/loggers";

/**
 * Outside guilds (DMs, group DMs) only commands that declare a non-guild context run.
 * Components pass: Discord only accepts clicks on components of messages the bot sent,
 * and outside guilds those come from such commands.
 */
const allowedOutsideGuild = (interaction: Interaction, client: TetraClient) => {
  if (interaction.isButton() || interaction.isStringSelectMenu()) return true;
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return false;

  const command = interaction.isMessageContextMenuCommand()
    ? client.contextMenuMessageCommands.get(interaction.commandName)
    : client.chatInputCommands.get(interaction.commandName);

  return (
    command?.metadata.contexts?.some(
      (context) => context !== InteractionContextType.Guild
    ) ?? false
  );
};

export const interactionCreateHandler: EventHandler<Events.InteractionCreate> = async (
  interaction
) => {
  // `inGuild()` is also true in guilds without the bot (user installs): `guildId` is set,
  // `guild` is null. Handlers that need the guild check `interaction.guild` themselves.
  if (!interaction.inGuild() && !allowedOutsideGuild(interaction, internalClient)) {
    if (!interaction.isRepliable()) return;
    await interaction.reply("this command only works in a server");
    return;
  }

  const isCommand = interaction.isCommand();
  const isButton = interaction.isButton();
  const isSelectMenu = interaction.isStringSelectMenu();
  const isAutocomplete = interaction.isAutocomplete();

  const supportedInteraction = isCommand || isButton || isSelectMenu || isAutocomplete;

  if (supportedInteraction) {
    try {
      await interactionHandler(interaction, internalClient);
    } catch (error) {
      BotConsole.error("Failed to handle interaction:", error);
    }
  }
};
