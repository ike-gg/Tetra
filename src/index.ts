import { Client, GatewayIntentBits, Events } from "discord.js";

import { DiscordBot } from "./types";
import DiscordOauth2 from "discord-oauth2";
import TaskManager from "./utils/managers/TaskManager";
import importInteractions from "./importInteractions";
import interactionHandler from "./interactionHandler";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import apiRouter from "./api/apiRouter";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import { refreshUsersTokens } from "./utils/database/refreshUsersTokens";
import { env } from "./env";
import { BLACKLISTED_GUILDS } from "./blacklistedguilds";

if (env.node_env === "development") {
  console.log("---- Running in development mode ----");
} else if (env.node_env === "production") {
  console.log("---- RUNNING IN PRODUCTION ----");
}

const PORT = env.PORT;

const app = express();

const limiter = rateLimit({
  windowMs: 30000,
  max: 20,
});

app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: [
      "https://tetra.lol",
      "http://localhost:3001",
      "http://localhost:3000",
      "https://www.tetra.lol",
      "https://panel.tetra.lol",
      "https://tetra.lol",
    ],
  })
);
app.use(limiter);
app.use(bodyParser.json({ limit: "10mb" }));
app.use("/", apiRouter);
app.listen(PORT);

const client = new Client({
  intents: [
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
}) as DiscordBot;

importInteractions(client);
client.tasks = TaskManager.getInstance();

client.on(Events.ClientReady, async (client) => {
  console.info(`${client.user.username} connected. Bot ready.`);
});

client.on(Events.GuildCreate, async (guild) => {
  const guildBlacklisted = BLACKLISTED_GUILDS.find(
    (g) => g.guildId === guild.id
  );
  if (guildBlacklisted) {
    guildBlacklisted.isActive && guild.leave();
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inGuild() && interaction.isRepliable()) {
    interaction.reply("Not supported yet.");
  }

  const isCommand = interaction.isCommand();
  const isButton = interaction.isButton();
  const isSelectMenu = interaction.isSelectMenu();
  const isAutocomplete = interaction.isAutocomplete();

  const supportedInteraction =
    isCommand || isButton || isSelectMenu || isAutocomplete;

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
});

export { client, discordOauth };
