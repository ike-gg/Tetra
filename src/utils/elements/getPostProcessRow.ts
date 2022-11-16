import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getPostProcessRow = (
  taskId: string,
  options?: {
    isEmoteAnimated?: boolean;
  }
) => {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:rename`)
      .setEmoji({ name: "✏️" })
      .setLabel("Rename emote")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${taskId}:square`)
      .setEmoji({ name: "⬜" })
      .setLabel("Stretch to fit")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${taskId}:center`)
      .setEmoji({ name: "📦" })
      .setLabel("Center and crop to fit")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  if (options?.isEmoteAnimated) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${taskId}:static`)
        .setEmoji({ name: "🏞️" })
        .setLabel("Make emote static")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }
  return row;
};

export default getPostProcessRow;
