import { ButtonInteraction } from "discord.js";
import { TetraEmbed } from "../utils/embedMessages/TetraEmbed";

const cancelAction = {
  data: {
    name: "cancelAction",
  },
  async execute(interaction: ButtonInteraction) {
    await interaction.update({
      components: [],
      files: [],
    });
    try {
      await interaction.message.delete();
    } catch {
      await interaction.editReply({
        embeds: [TetraEmbed.error("Missing permissions to delete this message.")],
      });
    }
  },
};

export default cancelAction;
