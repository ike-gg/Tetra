import type {
  AutocompleteInteraction,
  ButtonInteraction,
  Client,
  Collection,
  CommandInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { z } from "zod";

import type { AnyContinuity } from "@/interactions/continuity/base-continuity";

import type {
  ChatInputCommandHandler,
  ContextMenuMessageCommandHandler,
  GenericButtonInteractionHandler,
} from "../interactions";
import type { FeedbackManager } from "../utils/managers/feedback-manager";

export interface TetraClient extends Client {
  chatInputCommands: Collection<string, ChatInputCommandHandler>;
  contextMenuMessageCommands: Collection<string, ContextMenuMessageCommandHandler>;
  genericButtonInteractions: Collection<string, GenericButtonInteractionHandler>;
  globalButtonInteractions: Collection<string, AnyContinuity>;
  globalSelectMenuInteractions: Collection<string, AnyContinuity>;
}

export interface ExecutableCommandInteraction extends CommandInteraction {
  execute(interaction: CommandInteraction, client?: TetraClient): void;
  autocomplete(interaction: AutocompleteInteraction, client?: TetraClient): void;
}

export interface ExecutableButtonInteraction extends ButtonInteraction {
  execute(interaction: ButtonInteraction, client?: TetraClient): void;
}

export interface ExecutableSelectMenu extends StringSelectMenuInteraction {
  execute(interaction: StringSelectMenuInteraction, client?: TetraClient): void;
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
