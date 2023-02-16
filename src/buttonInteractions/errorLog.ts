import { ButtonInteraction, TextChannel } from "discord.js";
import { DiscordBot } from "../types";

const errorLog = {
  data: { name: "errorLog" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    await interaction.update({ components: [] });
    try {
      const errorSnapshotsChannel = (await client.channels.fetch(
        "1075586205070151710"
      )) as TextChannel;

      if (!errorSnapshotsChannel) return;

      const { id, username } = interaction.user;
      const originalInteraction = interaction.message.interaction;
      const errorEmbedMessage = interaction.message.embeds[0];

      errorSnapshotsChannel.send({
        content: `\`user ${username} (${id})\`, command: \`${
          originalInteraction?.commandName
        }\` details: \`\`\`${JSON.stringify(
          originalInteraction
        )}\`\`\`received embed:`,
        embeds: [errorEmbedMessage],
      });
    } catch (error) {
      console.error(error);
    }
  },
};

export default errorLog;
