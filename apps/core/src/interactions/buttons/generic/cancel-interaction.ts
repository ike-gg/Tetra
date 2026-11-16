import { ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";

import { GenericButtonInteractionHandler } from "../..";

const BUTTON_INTERACTION_KEY = "cancel-interaction";

const CancelInteractionGenericButton = new GenericButtonInteractionHandler(
  {
    name: BUTTON_INTERACTION_KEY,
    getButton: (data) =>
      new ButtonBuilder(data)
        .setLabel("Cancel")
        .setCustomId(BUTTON_INTERACTION_KEY)
        .setStyle(ButtonStyle.Danger),
  },
  async (interaction) => {
    // v2 messages can't take `content`: the same text goes into a Text Display
    const isV2 = interaction.message.flags.has(MessageFlags.IsComponentsV2);
    const textOnly = (content: string) =>
      isV2
        ? { components: [{ type: ComponentType.TextDisplay as const, content }] }
        : { content, components: [] };

    await interaction.update({
      ...textOnly("-# Interaction cancelled"),
      files: [],
      ...(isV2 ? {} : { embeds: [] }),
    });
    try {
      await interaction.message.delete();
    } catch {
      await interaction.editReply(
        textOnly(
          `-# Interaction cancelled, cannot delete message due to missing permissions. You can remove it manually.`
        )
      );
    }
  }
);

export default CancelInteractionGenericButton;
