import { Client, GatewayIntentBits, Options } from "discord.js";

import { env } from "@/env";
import { importInteractions } from "@/interactions/import-interactions";

import { clientEvents } from "./events";
import { TetraClient } from "./types";
import TaskManager from "./utils/managers/TaskManager";

const client = new Client({
  intents: [
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  makeCache: Options.cacheWithLimits(Options.DefaultMakeCacheSettings),
}) as TetraClient;

importInteractions(client);

client.tasks = TaskManager.getInstance();

clientEvents.forEach((callback, event) => {
  client.on(event, callback);
});

client.login(env.DISCORD_BOT_TOKEN);

export { client as internalClient };
