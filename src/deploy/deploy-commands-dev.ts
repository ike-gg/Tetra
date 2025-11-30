import { REST, Routes } from "discord.js";

import { env } from "@/env";

import { InteractionsFileManager } from "#/files/interactions-file-manager";
import { DeployConsole } from "#/loggers";

if (!env.DEV_GUILDS) {
  DeployConsole.error("DEV_GUILDS not set in .env");
  process.exit(1);
}

const chatInputCommands = (
  await InteractionsFileManager.getGlobalChatInputCommands()
).map((command) => command.metadata.toJSON());

DeployConsole.info(
  `Loaded ${chatInputCommands.length} commands:`,
  chatInputCommands.map((command) => command.name).join(", ")
);

const internalChatInputCommands = (
  await InteractionsFileManager.getInternalChatInputCommands()
).map((command) => command.metadata.toJSON());

DeployConsole.info(
  `Loaded ${internalChatInputCommands.length} internal commands:`,
  internalChatInputCommands.map((command) => command.name).join(", ")
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

const commands = [
  ...chatInputCommands,
  ...internalChatInputCommands,
  ...contextMenuMessageCommands,
];

env.DEV_GUILDS.forEach(async (guildId) => {
  try {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_BOT_ID, guildId), {
      body: commands,
    });

    DeployConsole.success(`Successfully registered to guild ${guildId}`);
  } catch (error) {
    DeployConsole.error(`Error registering to guild ${guildId}:`, error);
  }
});
