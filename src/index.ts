require("dotenv").config();

import fs from "fs";
import path from "node:path";
import { Client, Collection, GatewayIntentBits, Events } from "discord.js";

import {
  DiscordBot,
  ExecutableButtonInteraction,
  ExecutableCommandInteraction,
} from "./types";
import TaskManager from "./utils/managers/TaskManager";
import { FeedbackManager } from "./utils/managers/FeedbackManager";

const discordBotToken = process.env.discordBotToken as string;

const client = new Client({
  intents: [GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.Guilds],
}) as DiscordBot;

client.commands = new Collection();
client.buttonInteractions = new Collection();
client.tasks = new TaskManager();

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

const buttonInteractionsPath = path.join(__dirname, "buttonInteractions");
const buttonInteractionsFiles = fs
  .readdirSync(buttonInteractionsPath)
  .filter((file) => file.endsWith(".ts"));

for (const file of buttonInteractionsFiles) {
  const filePath = path.join(buttonInteractionsPath, file);
  import(filePath).then((buttonInteraction) => {
    client.buttonInteractions.set(
      buttonInteraction.default.data.name,
      buttonInteraction.default
    );
  });
}

client.on("ready", () => {
  console.log("Bot ready");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inGuild() && interaction.isRepliable()) {
    interaction.reply("Not supported yet.");
  }

  if (interaction.isCommand()) {
    const command = client.commands.get(
      interaction.commandName
    ) as ExecutableCommandInteraction;

    if (!command) return;

    try {
      command.execute(interaction, client);
    } catch {
      console.error;
    }
  }

  if (interaction.isButton()) {
    if (!(interaction.user.id === interaction.message.interaction!.user.id)) {
      return;
    }

    const interactionTaskId = interaction.customId.split(":")[0];
    const taskDetails = client.tasks.getTask(interactionTaskId);

    if (!taskDetails) {
      const feedback = new FeedbackManager(interaction);
      feedback.removeButtons();
      feedback.error("Request timed out. Create new interaction.");
      return;
    }

    const buttonInteraction = client.buttonInteractions.get(
      taskDetails.action
    ) as ExecutableButtonInteraction;

    if (!buttonInteraction) return;

    try {
      buttonInteraction.execute(interaction, client);
    } catch {
      console.error;
    }
  }
});

client.login(discordBotToken);
