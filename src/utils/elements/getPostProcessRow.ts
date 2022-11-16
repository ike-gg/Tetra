import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getPostProcessRow = (
  taskId: string,
  options?: {
    isEmoteAnimated?: boolean;
    origin?: "postProcess";
  }
) => {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:huj`)
      .setEmoji({ name: "💀" })
      .setLabel("post process options are not available during maintance")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
  // row.addComponents(
  //   new ButtonBuilder()
  //     .setCustomId(`${taskId}:rename`)
  //     .setEmoji({ name: "✏️" })
  //     .setLabel("Rename emote")
  //     .setStyle(ButtonStyle.Secondary)
  // );
  // if (!(options?.origin === "postProcess")) {
  //   row.addComponents(
  //     new ButtonBuilder()
  //       .setCustomId(`${taskId}:square`)
  //       .setEmoji({ name: "⬜" })
  //       .setLabel("Stretch to fit")
  //       .setStyle(ButtonStyle.Secondary)
  //   );
  //   row.addComponents(
  //     new ButtonBuilder()
  //       .setCustomId(`${taskId}:center`)
  //       .setEmoji({ name: "📦" })
  //       .setLabel("Center and crop to fit")
  //       .setStyle(ButtonStyle.Secondary)
  //   );
  // }

  // if (options?.isEmoteAnimated) {
  //   row.addComponents(
  //     new ButtonBuilder()
  //       .setCustomId(`${taskId}:static`)
  //       .setEmoji({ name: "🏞️" })
  //       .setLabel("Make emote static")
  //       .setStyle(ButtonStyle.Secondary)
  //       .setDisabled(true)
  //   );
  // }
  return row;
};

export default getPostProcessRow;
