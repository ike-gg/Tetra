import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getSubmitEmoteRow = (
  taskId: string,
  emoteName: string,
  options?: {
    isEmoteAnimated?: boolean;
  }
) => {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:submit`)
      .setEmoji({ name: "✅" })
      .setLabel(`Add emote as "${emoteName}"`)
      .setStyle(ButtonStyle.Success)
  );
  // row.addComponents(
  //   new ButtonBuilder()
  //     .setCustomId(`${taskId}:debug`)
  //     .setEmoji({ name: "💩" })
  //     .setLabel(`zesraj sie`)
  //     .setStyle(ButtonStyle.Danger)
  // );
  return row;
};

export default getSubmitEmoteRow;
