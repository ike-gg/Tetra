import fs from "fs";
import path from "node:path";
import {
  Client,
  Collection,
  CommandInteraction,
  GatewayIntentBits,
} from "discord.js";

import { DiscordBot, ExecutableCommandInteraction } from "./types";
import { discordBotToken } from "../config.json";

const client = new Client({
  intents: [GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.Guilds],
}) as DiscordBot;

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  import(filePath).then((command) => {
    client.commands.set(command.default.data.name, command.default);
  });
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(
    interaction.commandName
  ) as ExecutableCommandInteraction;

  if (!command) return;

  try {
    command.execute(interaction);
  } catch {
    console.error;
  }
});

client.login(discordBotToken);
