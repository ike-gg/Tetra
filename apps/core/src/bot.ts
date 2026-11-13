import { Client, GatewayIntentBits, Options } from "discord.js";

import { env } from "@/env";
import { importInteractions } from "@/interactions/import-interactions";
import { exitWhenManagerIsGone } from "@/lib/shards/exit-when-manager-is-gone";

import { clientEvents } from "./events";
import type { TetraClient } from "./types";

import { BotConsole } from "#/loggers";

const client = new Client({
  intents: [
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  makeCache: Options.cacheWithLimits(Options.DefaultMakeCacheSettings),
}) as TetraClient;

clientEvents.forEach((callback, event) => {
  client.on(event, callback);
});

// A shard must never outlive its manager (it would stay logged in with old code)
exitWhenManagerIsGone(() => client.destroy());

// Interactions must be loaded before login, otherwise early interactions find no handler.
const start = async () => {
  await importInteractions(client);
  await client.login(env.DISCORD_BOT_TOKEN);
};

start().catch((error) => {
  BotConsole.error("Failed to start shard:", error);
  process.exit(1);
});

export { client as internalClient };
