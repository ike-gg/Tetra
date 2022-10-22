import { ButtonInteraction } from "discord.js";

const cancelAction = {
  data: { name: "cancelAction" },
  async execute(interaction: ButtonInteraction) {
    await interaction.update({ components: [] });
    await interaction.message.delete();
  },
};

export default cancelAction;
