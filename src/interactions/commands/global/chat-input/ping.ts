import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";

const command = new SlashCommandBuilder().setName("ping").setDescription("Pong!");

export default new ChatInputCommandHandler(command, async (interaction) => {
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "🟢",
  });
});
