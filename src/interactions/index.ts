import {
  ButtonBuilder,
  ButtonComponentData,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  SharedSlashCommand,
} from "discord.js";

import { TetraClient } from "@/types";

export class ChatInputCommandHandler {
  constructor(
    readonly metadata: SharedSlashCommand,
    readonly handler: (
      interaction: ChatInputCommandInteraction,
      client: TetraClient
    ) => Promise<void>
  ) {}
}

export class ContextMenuMessageCommandHandler {
  constructor(
    readonly metadata: ContextMenuCommandBuilder,
    readonly handler: (
      interaction: MessageContextMenuCommandInteraction,
      client: TetraClient
    ) => Promise<void>
  ) {}
}

export class GenericButtonInteractionHandler {
  constructor(
    readonly metadata: {
      name: string;
      getButton: (data?: Partial<ButtonComponentData>) => ButtonBuilder;
    },
    readonly handler: (
      interaction: ButtonInteraction,
      client: TetraClient
    ) => Promise<void>
  ) {}
}
