import { SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";

const command = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get started with Tetra");

export default new ChatInputCommandHandler(command, async (interaction) => {
  await interaction.reply("Soon");
});
