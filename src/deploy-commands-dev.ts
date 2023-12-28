import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import path from "path";

import { REST, Routes, SlashCommandBuilder } from "discord.js";

import { devGuilds } from "../config.json";

const discordBotToken = process.env.discordBotToken as string;
const discordBotId = process.env.discordBotId as string;

const commands: any[] = [];

const commandsPath = path.join(__dirname, "commands");
const internalCommandsPath = path.join(__dirname, "commands_internal");

const commandFiles: string[] = [];
const internalCommandFiles: string[] = [];

fs.readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"))
  .forEach((file) => commandFiles.push(file));

fs.readdirSync(internalCommandsPath)
  .filter((file) => file.endsWith(".ts"))
  .forEach((file) => internalCommandFiles.push(file));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  const commandData = command.default.data as SlashCommandBuilder;
  commandData.setName(`dev${commandData.name}`);
  commands.push(commandData.toJSON());
}

for (const file of internalCommandFiles) {
  const filePath = path.join(internalCommandsPath, file);
  const command = require(filePath);
  const commandData = command.default.data as SlashCommandBuilder;
  commandData.setName(`dev${commandData.name}`);
  commands.push(commandData.toJSON());
}

console.log("loaded commands:" + commandFiles.join(", "));
console.log("loaded internal commands:" + internalCommandFiles.join(", "));

const rest = new REST({ version: "10" }).setToken(discordBotToken);

devGuilds.forEach((guildId) => {
  rest
    .put(Routes.applicationGuildCommands(discordBotId, guildId), {
      body: commands,
    })
    .then((data) => console.log(`successfully registered to guild ${guildId}`))
    .catch(console.error);
});
