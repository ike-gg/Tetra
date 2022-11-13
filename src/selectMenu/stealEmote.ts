import {
  CommandInteraction,
  SelectMenuInteraction,
  SlashCommandBuilder,
} from "discord.js";

const stealEmote = {
  data: { name: "stealEmote" },
  async execute(interaction: SelectMenuInteraction) {
    await interaction.reply({ ephemeral: true, content: "🟢" });
    interaction.reply("XD");
  },
};

export default stealEmote;
