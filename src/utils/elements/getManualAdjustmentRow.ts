import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getManualAdjustmentRow = (taskId: string) => {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:manual`)
      .setEmoji({ name: "🦖" })
      .setLabel("Manual adjustment (release soon)")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  );
  return row;
};

export default getManualAdjustmentRow;
