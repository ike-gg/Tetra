import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { ModalActionRowComponentBuilder } from "discord.js";
import { DiscordBot } from "../types";
import findCommonGuilds from "../utils/findCommonGuilds";

const debug = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("dev purposes")
    .addStringOption((option) =>
      option.setName("userid").setDescription("userid")
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const userid = interaction.options.getString("userid");
    const found = await findCommonGuilds(client.guilds.cache, userid!);
    const lol = found.map((guild) => guild.name);
  },
};

export default debug;
