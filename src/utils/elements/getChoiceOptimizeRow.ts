import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const getChoiceOptimizeRow = (taskId: string) => {
  const row = new ActionRowBuilder<ButtonBuilder>();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:auto`)
      .setEmoji({ name: "🤖" })
      .setLabel("Auto optimization")
      .setStyle(ButtonStyle.Secondary)
  );
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${taskId}:manual`)
      .setEmoji({ name: "🦦" })
      .setLabel("Manual adjustment")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  );
  return row;
};

export default getChoiceOptimizeRow;
