import { ButtonBuilder } from "@discordjs/builders";
import { ActionRowBuilder, ButtonStyle } from "discord.js";

const EmoteRequest = (requestId: string) => {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${requestId}:request`)
      .setEmoji({
        name: "📄",
      })
      .setLabel("Make a request")
      .setStyle(ButtonStyle.Primary)
  );
  return row;
};

export default EmoteRequest;
