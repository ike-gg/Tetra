import {
  AutocompleteInteraction,
  ButtonInteraction,
  Collection,
  CommandInteraction,
  SelectMenuInteraction,
  Client,
} from "discord.js";
import { z } from "zod";

import { BaseContinuity } from "@/interactions/continuity/base-continuity";

import {
  ChatInputCommandHandler,
  ContextMenuMessageCommandHandler,
  GenericButtonInteractionHandler,
} from "../interactions";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";

export interface TetraClient extends Client {
  chatInputCommands: Collection<string, ChatInputCommandHandler>;
  contextMenuMessageCommands: Collection<string, ContextMenuMessageCommandHandler>;
  genericButtonInteractions: Collection<string, GenericButtonInteractionHandler>;
  globalButtonInteractions: Collection<string, BaseContinuity<any>>;
  globalSelectMenuInteractions: Collection<string, BaseContinuity<any>>;

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

export const SupportedEmoteOriginSchema = z.enum([
  "discord",
  "7tv",
  "twitch",
  "bttv",
  "ffz",
  "tenor",
  "giphy",
  "imgur",
  "source",
]);

export type SupportedEmoteOrigin = z.infer<typeof SupportedEmoteOriginSchema>;

export type FittingOption = "fill" | "cover" | "contain";

export const EmoteSchema = z.object({
  id: z.string(),
  name: z.string(),
  animated: z.boolean(),
  origin: SupportedEmoteOriginSchema,
  author: z.string(),
  file: z.object({
    url: z.string(),
    preview: z.string(),
  }),
});

export type Emote = z.infer<typeof EmoteSchema>;

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
