import { ButtonInteraction } from "discord.js";
import errorEmbed from "../utils/embedMessages/errorEmbed";

const cancelAction = {
  data: { name: "cancelAction" },
  async execute(interaction: ButtonInteraction) {
    await interaction.update({ components: [], files: [] });
    try {
      await interaction.message.delete();
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed("Missing permissions to delete this message.")],
      });
    }
  },
};

export default cancelAction;
