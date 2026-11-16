import type { Events } from "discord.js";

import { loadFeedbackEmojis } from "@/utils/discord/feedback-emojis";

import type { EventHandler } from ".";

import { BotConsole } from "#/loggers";

export const readyHandler: EventHandler<Events.ClientReady> = async (client) => {
  BotConsole.success(`Logged in as ${client.user.username}`);
  await loadFeedbackEmojis(client);
};
