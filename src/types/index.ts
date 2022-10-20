import Discord, { ButtonInteraction, CommandInteraction } from "discord.js";

export interface DiscordBot extends Discord.Client {
  commands: Discord.Collection<string, Discord.CommandInteraction>;
  buttonInteractions: Discord.Collection<string, Discord.ButtonInteraction>;
}

export interface ExecutableCommandInteraction extends CommandInteraction {
  execute(interaction: CommandInteraction): void;
}

export interface ExecutableButtonInteraction extends ButtonInteraction {
  execute(interaction: ButtonInteraction): void;
}
