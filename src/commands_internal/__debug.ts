import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

import { DiscordBot } from "../types";

const debug = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("dev purposes")
    .addStringOption((option) => option.setName("userid").setDescription("userid")),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    // interaction.reply("wave");
  },
};

export default debug;
