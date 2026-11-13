import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";

import { env } from "@/env";
import { ChatInputCommandHandler } from "@/interactions";

const command = new SlashCommandBuilder()
  .setName("invite")
  .setDescription("Add Tetra to your server.");

export default new ChatInputCommandHandler(command, async (interaction) => {
  const button = new ButtonBuilder()
    .setLabel("Add Tetra to your server")
    .setStyle(ButtonStyle.Link)
    .setURL(env.INVITE_LINK);

  await interaction.reply({
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
  });
});
