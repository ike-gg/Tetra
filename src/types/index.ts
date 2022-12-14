import Discord, {
  ButtonInteraction,
  Collection,
  CommandInteraction,
  SelectMenuInteraction,
} from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";

export interface DiscordBot extends Discord.Client {
  commands: Collection<string, CommandInteraction>;
  buttonInteractions: Collection<string, ButtonInteraction>;
  selectMenu: Collection<string, SelectMenuInteraction>;
  tasks: TaskManager;
}

export interface ExecutableCommandInteraction extends CommandInteraction {
  execute(interaction: CommandInteraction, client?: DiscordBot): void;
}

export interface ExecutableButtonInteraction extends ButtonInteraction {
  execute(interaction: ButtonInteraction, client?: DiscordBot): void;
}

export interface ExecutableSelectMenu extends SelectMenuInteraction {
  execute(interaction: SelectMenuInteraction, client?: DiscordBot): void;
}

export interface ExtractedEmote {
  name: string;
  data: Buffer;
  finalData: Buffer;
  animated: boolean;
  preview: string;
  author?: string;
  id?: string;
  origin: "7tv" | "discord" | "twitch";
}

export interface FoundEmotesDiscord {
  name: string;
  animated: boolean;
  link: string;
  id: string;
  feedback?: FeedbackManager;
}
