import dotenv from "dotenv";
dotenv.config();

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

const discordBotToken = process.env.discordBotToken as string;
let env = process.env.env as "production" | "development";

const PORT = process.env.PORT || 3002;

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

if (!env) {
  console.error(
    "enviroment is not defined in .env file, running in production enviroment instead."
  );
  process.env.env = "production";
  env = "production";
}

const client = new Client({
  intents: [
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
}) as DiscordBot;

importInteractions(client);
client.tasks = TaskManager.getInstance();

client.on("ready", async () => {
  console.log("Bot ready");
  const guilds = client.guilds.cache
    .map((e) => ({
      name: e.name,
      count: e.memberCount,
    }))
    .sort((a, b) => a.count - b.count);
  console.table(guilds);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inGuild() && interaction.isRepliable()) {
    interaction.reply("Not supported yet.");
  }

  const isCommand = interaction.isCommand();
  const isButton = interaction.isButton();
  const isSelectMenu = interaction.isSelectMenu();

  const supportedInteraction = isCommand || isButton || isSelectMenu;

  if (supportedInteraction) {
    interactionHandler(interaction, client);
    return;
  }
});

client.login(discordBotToken);

const discordOauth = new DiscordOauth2({
  clientId: process.env.oauthClientId,
  clientSecret: process.env.oauthClientSecret,
});

export { client, discordOauth };
