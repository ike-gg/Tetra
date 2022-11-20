import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  EmbedBuilder,
  hyperlink,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordBot } from "../types";
import URLButton from "../utils/elements/URLButton";

const support = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Get support from bot support server"),
  async execute(interaction: CommandInteraction, client: DiscordBot) {
    const supportDiscordLink = "https://discord.gg/d6UsB853";
    const link = hyperlink("Click here!", supportDiscordLink);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      URLButton("Invite to support server", supportDiscordLink)
    );

    const messagePayload = new EmbedBuilder();
    messagePayload.setTitle("Get support from bot support server!");
    messagePayload.setDescription(link);
    messagePayload.setAuthor({
      name: client.user!.username,
      iconURL: client.user!.avatarURL()!,
      url: supportDiscordLink,
    });
    messagePayload.setColor(0x000000);

    await interaction.reply({
      embeds: [messagePayload],
      components: [actionRow],
      ephemeral: true,
    });
  },
};

export default support;
