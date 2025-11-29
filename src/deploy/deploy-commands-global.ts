import { REST, Routes } from "discord.js";

import { env } from "@/env";

import { InteractionsFileManager } from "#/files/interactions-file-manager";
import { DeployConsole } from "#/loggers";

const chatInputCommands = (
  await InteractionsFileManager.getGlobalChatInputCommands()
).map((command) => command.metadata.toJSON());

DeployConsole.info(
  `Loaded ${chatInputCommands.length} commands:`,
  chatInputCommands.map((command) => command.name).join(", ")
);

const contextMenuMessageCommands = (
  await InteractionsFileManager.getGlobalContextMenuMessageCommands()
).map((command) => command.metadata.toJSON());

DeployConsole.info(
  `Loaded ${contextMenuMessageCommands.length} context menu message commands:`,
  contextMenuMessageCommands.map((command) => command.name).join(", ")
);

const rest = new REST({
  version: "10",
}).setToken(env.DISCORD_BOT_TOKEN);

const commands = [...chatInputCommands, ...contextMenuMessageCommands];

try {
  await rest.put(Routes.applicationCommands(env.DISCORD_BOT_ID), {
    body: commands,
  });

  DeployConsole.success(`Successfully registered ${commands.length} commands`);
} catch (error) {
  DeployConsole.error(`Error registering commands:`, error);
}
