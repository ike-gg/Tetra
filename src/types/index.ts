import Discord, { CommandInteraction } from "discord.js";

export interface DiscordBot extends Discord.Client {
  commands: Discord.Collection<string, Discord.CommandInteraction>;
}

export interface ExecutableCommandInteraction extends CommandInteraction {
  execute(interaction: CommandInteraction): void;
}
