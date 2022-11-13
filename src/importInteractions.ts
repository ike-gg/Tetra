import dotenv from "dotenv";
dotenv.config();
let env = process.env.env;
import {
  ButtonInteraction,
  Collection,
  CommandInteraction,
  SelectMenuInteraction,
  SlashCommandBuilder,
} from "discord.js";
import path from "path";
import fs from "fs";
import { DiscordBot } from "./types";

const importInteractions = (client: DiscordBot) => {
  client.commands = new Collection();
  importCommands(client.commands);

  client.buttonInteractions = new Collection();
  importButtonInteractions(client.buttonInteractions);

  client.selectMenu = new Collection();
  importSelectMenu(client.selectMenu);
};

const importCommands = (
  clientCommands: Collection<string, CommandInteraction>
) => {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    import(filePath).then((command) => {
      const commandData = command.default.data as SlashCommandBuilder;

      if (env === "development") {
        commandData.setName(`dev${commandData.name}`);
      }

      clientCommands.set(commandData.name, command.default);
    });
  }
};

const importButtonInteractions = (
  clientButtonInteractions: Collection<string, ButtonInteraction>
) => {
  const buttonInteractionsPath = path.join(__dirname, "buttonInteractions");
  const buttonInteractionsFiles = fs
    .readdirSync(buttonInteractionsPath)
    .filter((file) => file.endsWith(".ts"));

  for (const file of buttonInteractionsFiles) {
    const filePath = path.join(buttonInteractionsPath, file);
    import(filePath).then((buttonInteraction) => {
      clientButtonInteractions.set(
        buttonInteraction.default.data.name,
        buttonInteraction.default
      );
    });
  }
};

const importSelectMenu = (
  clientCommands: Collection<string, SelectMenuInteraction>
) => {
  const selectMenuPath = path.join(__dirname, "selectMenu");
  const selectMenuFiles = fs
    .readdirSync(selectMenuPath)
    .filter((file) => file.endsWith(".ts"));

  for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenuPath, file);
    import(filePath).then((selectMenuInteraction) => {
      clientCommands.set(
        selectMenuInteraction.default.data.name,
        selectMenuInteraction.default
      );
    });
  }
};

export default importInteractions;
