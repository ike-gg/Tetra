import {
  CommandInteraction,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";

const ping = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("dev purposes"),
  async execute(interaction: CommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("dev")
      .setDescription("dev class embedbuilder")
      .setAuthor({ name: interaction.user.id });
    interaction.reply({ embeds: [embed] });
  },
};

export default ping;
