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
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${taskId}:square`)
      .setEmoji({ name: "⬜" })
      .setLabel("Make emote square")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${taskId}:split`)
      .setEmoji({ name: "🪓" })
      .setLabel("Split emote into parts")
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
