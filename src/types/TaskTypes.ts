import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
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

export type Storeable = EmoteNavigator | EmotePicker | Base;
