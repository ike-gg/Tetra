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
  ExecutableSelectMenu,
} from "./types";
import TaskManager from "./utils/managers/TaskManager";
import { FeedbackManager } from "./utils/managers/FeedbackManager";
import errorEmbed from "./utils/embedMessages/errorEmbed";
import * as TaskTypes from "./types/TaskTypes";
import importInteractions from "./importInteractions";

const discordBotToken = process.env.discordBotToken as string;
let env = process.env.env as "production" | "development";

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
    const feedback = new FeedbackManager(interaction);

    const isDevCommand =
      interaction.message.interaction?.commandName.startsWith("dev");

    console.log("is dev command?", isDevCommand);

    if (env === "development" && !isDevCommand) return;
    if (env === "production" && isDevCommand) return;

    if (!(interaction.user.id === interaction.message.interaction!.user.id)) {
      const error = errorEmbed(
        "You are not allowed **YET** to use another users interactions!"
      );
      interaction.reply({ embeds: [error], ephemeral: true });
      return;
    }

    const interactionTaskId = interaction.customId.split(":")[0];

    let taskDetails;

    if (interactionTaskId === "cancelAction") {
      taskDetails = {
        action: "cancelAction",
      };
    } else {
      taskDetails = client.tasks.getTask(interactionTaskId);
    }

    if (!taskDetails) {
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

  if (interaction.isSelectMenu()) {
    const feedback = new FeedbackManager(interaction);
    if (!(interaction.user.id === interaction.message.interaction!.user.id)) {
      const error = errorEmbed(
        "You are not allowed **YET** to use another users interactions!"
      );
      interaction.reply({ embeds: [error], ephemeral: true });
      return;
    }

    const taskDetails = client.tasks.getTask(interaction.customId);

    if (!taskDetails) {
      await feedback.removeButtons();
      await feedback.error("Request timed out. Create new interaction.");
      return;
    }

    const selectMenuInteraction = client.selectMenu.get(
      taskDetails.action
    ) as ExecutableSelectMenu;

    if (!selectMenuInteraction) return;

    try {
      selectMenuInteraction.execute(interaction, client);
    } catch {
      console.error;
    }
  }
});

client.login(discordBotToken);
