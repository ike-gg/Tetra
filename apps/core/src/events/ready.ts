import type { Events } from "discord.js";

import type { EventHandler } from ".";

import { BotConsole } from "#/loggers";

export const readyHandler: EventHandler<Events.ClientReady> = async (client) => {
  BotConsole.success(`Logged in as ${client.user.username}`);
};
