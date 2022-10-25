import Discord, { ButtonInteraction, CommandInteraction } from "discord.js";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

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

export interface ExtractedEmote {
  name: string;
  image: Buffer;
  preview: string;
  author?: string;
  id?: string;
}

export interface FoundEmotesDiscord {
  name: string;
  animated: boolean;
  link: string;
  id: string;
  feedback?: FeedbackManager;
}
