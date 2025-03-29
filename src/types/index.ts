import {
  AutocompleteInteraction,
  ButtonInteraction,
  Collection,
  CommandInteraction,
  SelectMenuInteraction,
  Client,
} from "discord.js";

import {
  ChatInputCommandHandler,
  ContextMenuMessageCommandHandler,
} from "../interactions";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";

export interface TetraClient extends Client {
  chatInputCommands: Collection<string, ChatInputCommandHandler>;
  contextMenuMessageCommands: Collection<string, ContextMenuMessageCommandHandler>;
  buttonInteractions: Collection<string, ButtonInteraction>;
  selectMenu: Collection<string, SelectMenuInteraction>;
  tasks: TaskManager;
}

export interface ExecutableCommandInteraction extends CommandInteraction {
  execute(interaction: CommandInteraction, client?: TetraClient): void;
  autocomplete(interaction: AutocompleteInteraction, client?: TetraClient): void;
}

export interface ExecutableButtonInteraction extends ButtonInteraction {
  execute(interaction: ButtonInteraction, client?: TetraClient): void;
}

export interface ExecutableSelectMenu extends SelectMenuInteraction {
  execute(interaction: SelectMenuInteraction, client?: TetraClient): void;
}

export type SupportedEmotesOrigin =
  | "discord"
  | "7tv"
  | "twitch"
  | "bttv"
  | "ffz"
  | "tenor"
  | "giphy"
  | "imgur"
  | "source";

export type FittingOption = "fill" | "cover" | "contain";

export interface Emote {
  id: string;
  name: string;
  animated: boolean;
  origin: SupportedEmotesOrigin;
  author: string;
  file: {
    url: string;
    preview: string;
  };
}

export interface ExtractedEmote extends Emote {
  data: Buffer;
  finalData: Buffer;
  slices?: Buffer[];
  optimizedBuffer?: Buffer;
}

export interface FoundEmotesDiscord {
  name: string;
  animated: boolean;
  link: string;
  id: string;
  feedback?: FeedbackManager;
}
