import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

export interface TaskBase {
  action: string;
  interaction?:
    | CommandInteraction
    | ButtonInteraction
    | ContextMenuCommandInteraction;
  feedback?: FeedbackManager;
  // emoteReference?: string;
  message?: MessageComponentInteraction;
  // storeId?: string;
  // multiAdd?: boolean;
  // options?: {
  //   currentPage?: number;
  //   pagesLimit?: number;
  // };
}

export interface EmoteNavigatorTask extends TaskBase {
  storeId: string;
  multiAdd: boolean;
  currentPage: number;
  totalPages: number;
}

export default TaskBase;
