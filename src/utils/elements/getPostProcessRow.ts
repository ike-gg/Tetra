import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getPostProcessRow = (
  taskId: string,
  options?: {
    isEmoteAnimated?: boolean;
  }
) => {
  const { isEmoteAnimated } = options || {};

  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:rename`)
      .setEmoji({ name: "✏️" })
      .setLabel("Rename emote")
      .setStyle(ButtonStyle.Secondary)
  );
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:square`)
      .setEmoji({ name: "🖼️" })
      .setLabel("Stretch to fit")
      .setStyle(ButtonStyle.Secondary)
  );
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:center`)
      .setEmoji({ name: "🔍" })
      .setLabel("Center and crop to fit")
      .setStyle(ButtonStyle.Secondary)
  );
  !isEmoteAnimated &&
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${taskId}:removebg`)
        .setEmoji({ name: "✨" })
        .setLabel("Remove background")
        .setStyle(ButtonStyle.Secondary)
    );
  return row;
};

export default getPostProcessRow;
