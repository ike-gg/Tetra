import type {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  Guild,
  MessageComponentInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

import type { FeedbackManager } from "../utils/managers/feedback-manager";
import type { Emote, ExtractedEmote } from ".";

export interface Base {
  id: string;
  action: string;
  interaction?:
    | CommandInteraction
    | ButtonInteraction
    | ContextMenuCommandInteraction
    | StringSelectMenuInteraction;
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
