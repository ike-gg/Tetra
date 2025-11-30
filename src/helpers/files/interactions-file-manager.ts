import { Collection } from "discord.js";
import * as fs from "fs";
import path from "path";

import { FILE_PATH } from "@/constants/files";
import {
  GenericButtonInteractionHandler,
  ChatInputCommandHandler,
  ContextMenuMessageCommandHandler,
} from "@/interactions";
import { SelectEmoteButtonInteraction } from "@/interactions/buttons/global/select-emote";
import { BaseContinuity } from "@/interactions/continuity/base-continuity";

import { CoreConsole } from "#/loggers";

type CommandHandler =
  | ChatInputCommandHandler
  | ContextMenuMessageCommandHandler
  | GenericButtonInteractionHandler
  | SelectEmoteButtonInteraction
  | BaseContinuity<any>;

type CommandHandlerClass =
  | typeof ChatInputCommandHandler
  | typeof ContextMenuMessageCommandHandler
  | typeof GenericButtonInteractionHandler
  | typeof SelectEmoteButtonInteraction
  | typeof BaseContinuity<any>;

export class InteractionsFileManager {
  static getFilesFromDirectory(directory: string): string[] {
    return fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => path.join(directory, file));
  }

  static async getCommandsFromDirectory<T extends CommandHandler>(
    directory: string,
    commandHandler: CommandHandlerClass,
    { asInternal }: { asInternal?: boolean } = { asInternal: false }
  ): Promise<Collection<string, T>> {
    const commands = new Collection<string, T>();

    for (const file of this.getFilesFromDirectory(directory)) {
      const command = await import(file);

      if (!(command.default instanceof commandHandler)) continue;

      CoreConsole.dev.info("Loading command:", command.default.metadata.name);

      if (asInternal && !command.default.metadata.name.startsWith("internal-")) {
        command.default.metadata.name = `internal-${command.default.metadata.name}`;
      }

      commands.set(command.default.metadata.name, command.default as T);
    }

    return commands;
  }

  // chat input commands
  static async getGlobalChatInputCommands() {
    return this.getCommandsFromDirectory<ChatInputCommandHandler>(
      FILE_PATH.GLOBAL_CHAT_INPUT_COMMANDS,
      ChatInputCommandHandler
    );
  }

  static async getInternalChatInputCommands() {
    return this.getCommandsFromDirectory<ChatInputCommandHandler>(
      FILE_PATH.INTERNAL_CHAT_INPUT_COMMANDS,
      ChatInputCommandHandler,
      { asInternal: true }
    );
  }

  static async getChatInputCommands({
    withInternal = false,
  }: {
    withInternal?: boolean;
  }) {
    const global = await this.getGlobalChatInputCommands();
    const internal = await this.getInternalChatInputCommands();

    return withInternal ? global.concat(internal) : global;
  }

  // context menu message commands
  static async getGlobalContextMenuMessageCommands() {
    return this.getCommandsFromDirectory<ContextMenuMessageCommandHandler>(
      FILE_PATH.GLOBAL_CONTEXT_MENU_MESSAGE_COMMANDS,
      ContextMenuMessageCommandHandler
    );
  }

  // button interactions
  static async getGenericButtonInteractions() {
    return this.getCommandsFromDirectory<GenericButtonInteractionHandler>(
      FILE_PATH.GENERIC_BUTTON_INTERACTIONS,
      GenericButtonInteractionHandler
    );
  }

  static async getGlobalButtonInteractions() {
    return this.getCommandsFromDirectory<BaseContinuity<any>>(
      FILE_PATH.GLOBAL_BUTTON_INTERACTIONS,
      BaseContinuity
    );
  }

  static async getGlobalSelectMenuInteractions() {
    return this.getCommandsFromDirectory<BaseContinuity<any>>(
      FILE_PATH.SELECT_MENU_INTERACTIONS,
      BaseContinuity
    );
  }
}
