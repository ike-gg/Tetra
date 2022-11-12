import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "node:path";
import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
} from "discord.js";

import {
  DiscordBot,
  ExecutableButtonInteraction,
  ExecutableCommandInteraction,
} from "./types";
import TaskManager from "./utils/managers/TaskManager";
import { FeedbackManager } from "./utils/managers/FeedbackManager";
import errorEmbed from "./utils/embedMessages/errorEmbed";
import * as TaskTypes from "./types/TaskTypes";

const discordBotToken = process.env.discordBotToken as string;
let env = process.env.env as "production" | "development";

if (!env) {
  console.error(
    "enviroment is not defined in .env file, running in production enviroment instead."
  );
  env = "production";
}

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
    const commandData = command.default.data as SlashCommandBuilder;

    if (env === "development") {
      commandData.setName(`dev${commandData.name}`);
    }

    client.commands.set(commandData.name, command.default);
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
  console.log(client.guilds.cache.map((g) => g.name));
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
      const error = errorEmbed(
        "You are not allowed **YET** to use another users interactions!"
      );
      interaction.reply({ embeds: [error], ephemeral: true });
      return;
    }

    if (
      env === "development" &&
      !interaction.message.interaction?.commandName.startsWith("dev")
    )
      return;
    else if (
      env === "production" &&
      interaction.message.interaction?.commandName.startsWith("dev")
    )
      return;

    const interactionTaskId = interaction.customId.split(":")[0];

    let taskDetails;

    if (interactionTaskId === "cancelAction") {
      taskDetails = {
        action: "cancelAction",
      };
    } else {
      taskDetails =
        client.tasks.getTask<TaskTypes.EmoteNavigator>(interactionTaskId);
    }

    if (!taskDetails) {
      const feedback = new FeedbackManager(interaction);
      await feedback.removeButtons();
      await feedback.error("Request timed out. Create new interaction.");
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
