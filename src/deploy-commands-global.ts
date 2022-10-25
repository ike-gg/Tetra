import fs from "node:fs";
import path from "path";

import {
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { discordBotToken, discordBotId } from "../config.json";

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  import(filePath).then((command) => {
    commands.push(command.default.data.toJSON());
  });
}

const rest = new REST({ version: "10" }).setToken(discordBotToken);

rest
  .put(Routes.applicationCommands(discordBotId), {
    body: commands,
  })
  .then((data) => console.log(`successfully registered global commands`))
  .catch(console.error);
