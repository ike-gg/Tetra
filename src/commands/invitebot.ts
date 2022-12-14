import dotenv from "dotenv";
dotenv.config();

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

const inviteLink = process.env.inviteLink as string;

const invitebot = {
  data: new SlashCommandBuilder()
    .setName("invitebot")
    .setDescription(
      "Invite bot to your discord server and easily import emotes from 7tv."
    ),
  async execute(interaction: CommandInteraction, client: DiscordBot) {
    const link = hyperlink("Click here!", inviteLink);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      URLButton("Invite link", inviteLink)
    );

    const messagePayload = new EmbedBuilder();
    messagePayload.setTitle("Invitation link");
    messagePayload.setDescription(link);
    messagePayload.setAuthor({
      name: client.user!.username,
      iconURL: client.user!.avatarURL()!,
      url: inviteLink,
    });
    messagePayload.setColor(0x000000);

    await interaction.reply({
      embeds: [messagePayload],
      components: [actionRow],
    });
  },
};

export default invitebot;
