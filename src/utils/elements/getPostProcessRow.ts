import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getPostProcessRow = (
  taskId: string,
  options?: {
    isEmoteAnimated?: boolean;
  }
) => {
  const { isEmoteAnimated } = options || {};

  const postProcessRow = new ActionRowBuilder<ButtonBuilder>();
  const splitRow = new ActionRowBuilder<ButtonBuilder>();

  !isEmoteAnimated &&
    [2, 3, 4].forEach((splitCount) => {
      splitRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`${taskId}:split:${splitCount}`)
          .setEmoji({ name: "🪓" })
          .setLabel(`Split into ${splitCount}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });

  postProcessRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:rename`)
      .setEmoji({ name: "✏️" })
      .setLabel("Rename emote")
      .setStyle(ButtonStyle.Secondary)
  );
  postProcessRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:square`)
      .setEmoji({ name: "🖼️" })
      .setLabel("Stretch to fit")
      .setStyle(ButtonStyle.Secondary)
  );
  postProcessRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:center`)
      .setEmoji({ name: "🔍" })
      .setLabel("Center and crop to fit")
      .setStyle(ButtonStyle.Secondary)
  );
  !isEmoteAnimated &&
    postProcessRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${taskId}:removebg`)
        .setEmoji({ name: "✨" })
        .setLabel("Remove background")
        .setStyle(ButtonStyle.Secondary)
    );

  return splitRow.components.length > 0
    ? [postProcessRow, splitRow]
    : [postProcessRow];
};

export default getPostProcessRow;
