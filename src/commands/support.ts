import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordBot } from "../types";
import URLButton from "../utils/elements/URLButton";

const support = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Get support from bot support server"),
  async execute(interaction: CommandInteraction, client: DiscordBot) {
    const supportDiscordLink = "https://discord.gg/dNqBstzs4p";

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      URLButton("Join support server!", supportDiscordLink)
    );

    await interaction.reply({
      components: [actionRow],
    });
  },
};

export default support;
