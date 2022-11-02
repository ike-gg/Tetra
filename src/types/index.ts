import Discord, { ButtonInteraction, CommandInteraction } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";

export interface DiscordBot extends Discord.Client {
  commands: Discord.Collection<string, Discord.CommandInteraction>;
  buttonInteractions: Discord.Collection<string, Discord.ButtonInteraction>;
  tasks: TaskManager;
}

export interface ExecutableCommandInteraction extends CommandInteraction {
  execute(interaction: CommandInteraction, client?: DiscordBot): void;
}

export interface ExecutableButtonInteraction extends ButtonInteraction {
  execute(interaction: ButtonInteraction, client?: DiscordBot): void;
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
