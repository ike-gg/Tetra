import { Client, GatewayIntentBits, Events, Options } from "discord.js";

import { DiscordBot } from "./types";
import DiscordOauth2 from "discord-oauth2";
import TaskManager from "./utils/managers/TaskManager";
import importInteractions from "./importInteractions";
import interactionHandler from "./interactionHandler";
import cron from "node-cron";
import { refreshUsersTokens } from "./utils/database/refreshUsersTokens";
import { env } from "./env";
import { BLACKLISTED_GUILDS } from "./blacklistedguilds";
import { initApi } from "./api";

process.title = "tetra-bot";

if (env.node_env === "development") {
  console.log("---- Running in development mode ----");
} else if (env.node_env === "production") {
  console.log("---- RUNNING IN PRODUCTION ----");
}

initApi();

const client = new Client({
  intents: [
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  makeCache: Options.cacheWithLimits(Options.DefaultMakeCacheSettings),
}) as DiscordBot;

importInteractions(client);
client.tasks = TaskManager.getInstance();

client.on(Events.ClientReady, async (client) => {
  console.info(`${client.user.username} connected. Bot ready.`);
});

client.on(Events.GuildCreate, async (guild) => {
  const guildBlacklisted = BLACKLISTED_GUILDS.find((g) => g.guildId === guild.id);

  if (guildBlacklisted) {
    guildBlacklisted.isActive && guild.leave();
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  const inGuild = interaction.inGuild();

  if (!inGuild) {
    return;
  }

  const isCommand = interaction.isCommand();
  const isButton = interaction.isButton();
  const isSelectMenu = interaction.isSelectMenu();
  const isAutocomplete = interaction.isAutocomplete();

  const supportedInteraction = isCommand || isButton || isSelectMenu || isAutocomplete;

  if (supportedInteraction) {
    try {
      interactionHandler(interaction, client);
    } catch (error) {
      console.error("Failed to handle interaction: ", error);
    }
  }
});

const CRON_EVERY_3_HOURS = "0 */3 * * *";
cron.schedule(CRON_EVERY_3_HOURS, () => {
  refreshUsersTokens();
});

client.login(env.discordBotToken);

const discordOauth = new DiscordOauth2({
  clientId: env.oauthClientId,
  clientSecret: env.oauthClientSecret,
  version: "v10",
});

export { client, discordOauth };
