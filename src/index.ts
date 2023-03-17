import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Events } from "discord.js";

import { DiscordBot } from "./types";
import TaskManager from "./utils/managers/TaskManager";
import importInteractions from "./importInteractions";
import interactionHandler from "./interactionHandler";
import express from "express";
import bodyParser from "body-parser";
import apiv1 from "./api/v1/apiv1";

const discordBotToken = process.env.discordBotToken as string;
let env = process.env.env as "production" | "development";

const PORT = process.env.PORT || 443;
console.log("got port", PORT);

const app = express();
app.use(bodyParser.json());
app.use("/api/v1", apiv1);
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
client.tasks = new TaskManager();

client.on("ready", async () => {
  console.log("Bot ready");
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
