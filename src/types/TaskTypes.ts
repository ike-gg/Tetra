import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  GuildEmoji,
  MessageComponentInteraction,
} from "discord.js";
import { ExtractedEmote, FoundEmotesDiscord } from ".";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

export interface Base {
  id: string;
  action: string;
  interaction?:
    | CommandInteraction
    | ButtonInteraction
    | ContextMenuCommandInteraction;
  feedback?: FeedbackManager;
  message?: MessageComponentInteraction;
}

export interface EmoteNavigator extends Base {
  action: "navigatorPage";
  storeId: string;
  multiAdd: boolean;
  currentPage: number;
  totalPages: number;
}

export interface EmotePicker extends Base {
  action: "selectEmote";
  emoteReference: string;
}

export interface StealEmote extends Base {
  action: "stealEmote";
  emote: FoundEmotesDiscord;
  feedback: FeedbackManager;
}

export interface PostProcessEmote extends Base {
  action: "postProcess";
  emoteGuild: GuildEmoji;
  emote: ExtractedEmote;
}

export type Storeable =
  | EmoteNavigator
  | EmotePicker
  | StealEmote
  | PostProcessEmote
  | Base;
