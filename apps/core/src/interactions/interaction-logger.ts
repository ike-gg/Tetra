import type { CommandInteraction, CommandInteractionOption } from "discord.js";

import { db } from "@/db";
import { interactions } from "@/db/schema";

import { BotConsole } from "#/loggers";

/** Plain data only: resolved users, channels and attachments are dropped. */
const serializeOption = (option: CommandInteractionOption): Record<string, unknown> => ({
  name: option.name,
  type: option.type,
  ...(option.value !== undefined && { value: option.value }),
  ...(option.focused && { focused: true }),
  ...(option.options && { options: option.options.map(serializeOption) }),
});

/** Never throws: if the options cannot be serialized, the interaction is logged without input. */
const getLoggedInput = (interaction: CommandInteraction) => {
  try {
    const rawOptions =
      interaction.isChatInputCommand() || interaction.isContextMenuCommand()
        ? interaction.options.data
        : [];
    const options = rawOptions.map(serializeOption);

    // Round trip guarantees JSON-safe data for jsonb (bigint values become strings)
    return JSON.parse(
      JSON.stringify({ options }, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    ) as Record<string, unknown>;
  } catch (error) {
    BotConsole.error("Failed to serialize interaction options:", error);
    return null;
  }
};

export const interactionLogger = async (interaction: CommandInteraction) => {
  try {
    // `guild` is null where the bot isn't a member (user installs), `guildId` is still set
    const { guild, guildId, user, id } = interaction;

    const command = [interaction.commandName];

    if (interaction.isChatInputCommand()) {
      try {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand) command.push(subcommand);
      } catch {
        // getSubcommand throws when the command has no subcommand.
      }
    }

    const commandName = command.join(".");

    BotConsole.log(
      `${commandName} - [${id}] - ${user.username} (${user.id}) in ${guildId ? `${guild?.name ?? "guild without bot"} (${guildId})` : "DM"}`
    );

    await db.insert(interactions).values({
      command: commandName,
      guildId,
      userId: user.id,
      id: BigInt(id),
      input: getLoggedInput(interaction),
    });
  } catch (e) {
    BotConsole.error("Error occured while logging interaction:", e);
  }
};
