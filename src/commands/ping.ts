import { CommandInteraction, SlashCommandBuilder } from "discord.js";

const ping = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Check if I am alive."),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({
      ephemeral: true,
      content: "🟢",
    });
  },
};

export default ping;
