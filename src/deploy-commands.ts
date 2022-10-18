import fs from "node:fs";
import path from "path";

import { REST, Routes } from "discord.js";
import { discordBotToken, discordBotId } from "../config.json";

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(discordBotToken);

rest
  .put(Routes.applicationGuildCommands(discordBotId, "823926383491022878"), {
    body: commands,
  })
  .then((data) => console.log(`successfully registered`))
  .catch(console.error);
