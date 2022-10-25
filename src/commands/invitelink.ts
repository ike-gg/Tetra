import { CommandInteraction, SlashCommandBuilder } from "discord.js";

const ping = {
  data: new SlashCommandBuilder()
    .setName("botlink")
    .setDescription(
      "Invite bot to your discord server and easily import emotes from 7tv."
    ),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({ embeds: [{}] });
  },
};

export default ping;
