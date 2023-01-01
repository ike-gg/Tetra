import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  Guild,
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
  origin: "7tv" | "discord" | "twitch";
  emoteReference: string;
  name?: string;
  animated?: boolean;
  preview?: string;
  url?: string;
}

export interface StealEmote extends Base {
  action: "stealEmote";
  emote: FoundEmotesDiscord;
  feedback: FeedbackManager;
}

export interface PostProcessEmote extends Base {
  action: "postProcess";
  emote: ExtractedEmote;
  feedback: FeedbackManager;
  guild: Guild;
}

export type Storeable = EmoteNavigator | EmotePicker | StealEmote | Base;
