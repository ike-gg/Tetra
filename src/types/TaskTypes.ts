import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  Guild,
  MessageComponentInteraction,
  SelectMenuInteraction,
} from "discord.js";
import { Emote, ExtractedEmote } from ".";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

export interface Base {
  id: string;
  action: string;
  interaction?:
    | CommandInteraction
    | ButtonInteraction
    | ContextMenuCommandInteraction
    | SelectMenuInteraction;
  feedback?: FeedbackManager;
  message?: MessageComponentInteraction;
  webAccess?: boolean;
  expiresIn?: number;
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
  emote: Emote;
}

export interface StealEmote extends Base {
  action: "stealEmote";
  emote: Emote;
  feedback: FeedbackManager;
}

export interface StealReaction extends Base {
  action: "stealReaction";
  emote: Emote[];
  feedback: FeedbackManager;
}

export interface PostProcessEmote extends Base {
  action: "postProcess";
  emote: ExtractedEmote;
  feedback: FeedbackManager;
  guild: Guild;
}

export type Storable =
  | EmoteNavigator
  | EmotePicker
  | StealEmote
  | StealReaction
  | PostProcessEmote
  | Base;
