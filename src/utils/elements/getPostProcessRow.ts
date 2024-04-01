import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle, SelectMenuBuilder } from "discord.js";

const getPostProcessRow = (
  taskId: string,
  options?: {
    isEmoteAnimated?: boolean;
  }
) => {
  const { isEmoteAnimated } = options || {};

  const postProcessRow = new ActionRowBuilder<ButtonBuilder>();
  const splitMenu = new ActionRowBuilder<SelectMenuBuilder>();

  const menuSplit = new SelectMenuBuilder()
    .setCustomId(`${taskId}:split`)
    .setPlaceholder("Split emote into...");

  [2, 3, 4, 5].forEach((splitCount) => {
    menuSplit.addOptions({
      label: `Split into ${splitCount} parts`,
      value: splitCount.toString(),
    });
  });

  menuSplit.options.length > 0 && splitMenu.addComponents(menuSplit);

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

  return splitMenu.components.length > 0
    ? [postProcessRow, splitMenu]
    : [postProcessRow];
};

export default getPostProcessRow;
