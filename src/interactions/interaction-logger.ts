import type { CommandInteraction } from "discord.js";

import { db } from "@/db";
import { interactions } from "@/db/schema";

import { BotConsole } from "#/loggers";

export const interactionLogger = async (interaction: CommandInteraction) => {
  try {
    const { guild, user, id } = interaction;

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
      `${commandName} - [${id}] - ${user.username} (${user.id}) in ${guild?.name} (${guild?.id})`
    );

    await db.insert(interactions).values({
      command: commandName,
      guildId: guild?.id,
      userId: user.id,
      id: Number(id),
      input: JSON.stringify("options" in interaction ? interaction.options : null),
    });
  } catch (e) {
    BotConsole.error("Error occured while logging interaction:", e);
  }
};
