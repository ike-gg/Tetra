import { ButtonBuilder, ButtonStyle } from "discord.js";

import { GenericButtonInteractionHandler } from "../..";

const BUTTON_INTERACTION_KEY = "cancel-interaction";

export const cancelInteractionGenericButton = new GenericButtonInteractionHandler(
  {
    name: BUTTON_INTERACTION_KEY,
    getButton: (data) =>
      new ButtonBuilder(data)
        .setLabel("Cancel")
        .setCustomId(BUTTON_INTERACTION_KEY)
        .setStyle(ButtonStyle.Danger),
  },
  async (interaction) => {
    console.log("running from cancel handler!!!");

    await interaction.update({
      content: "-# Interaction cancelled",
      components: [],
      files: [],
    });
    try {
      await interaction.message.delete();
    } catch {
      await interaction.editReply({
        content: `-# Interaction cancelled, cannot delete message due to missing permissions. You can remove it manually.`,
      });
    }
  }
);

export default cancelInteractionGenericButton;
