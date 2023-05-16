import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordBot } from "../types";
import URLButton from "../utils/elements/URLButton";
import { inviteLink } from "../constants";

const invitebot = {
  data: new SlashCommandBuilder()
    .setName("invitebot")
    .setDescription(
      "Invite bot to your discord server and easily import emotes from 7tv."
    ),
  async execute(interaction: CommandInteraction, client: DiscordBot) {
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      URLButton("Invite link", inviteLink || "https://tetra.lol")
    );

    await interaction.reply({
      components: [actionRow],
    });
  },
};

export default invitebot;
