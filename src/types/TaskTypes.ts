import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

export interface TaskBase {
  id: string;
  action: string;
  interaction?:
    | CommandInteraction
    | ButtonInteraction
    | ContextMenuCommandInteraction;
  feedback?: FeedbackManager;
  message?: MessageComponentInteraction;
}

export interface EmoteNavigator extends TaskBase {
  action: "navigatorPage";
  storeId: string;
  multiAdd: boolean;
  currentPage: number;
  totalPages: number;
}

export interface EmotePicker extends TaskBase {
  action: "selectEmote";
  emoteReference: string;
}
