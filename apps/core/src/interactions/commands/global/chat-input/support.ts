import { SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";

const command = new SlashCommandBuilder()
  .setName("help")
  .setDescription("get started with tetra");

export default new ChatInputCommandHandler(command, async (interaction) => {
  await interaction.reply("help is coming soon");
});
