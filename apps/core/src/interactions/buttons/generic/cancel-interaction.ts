import { ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";

import { GenericButtonInteractionHandler } from "../..";

const BUTTON_INTERACTION_KEY = "cancel-interaction";

const CancelInteractionGenericButton = new GenericButtonInteractionHandler(
  {
    name: BUTTON_INTERACTION_KEY,
    getButton: (data) =>
      new ButtonBuilder(data)
        .setLabel("cancel")
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
      ...textOnly("-# cancelled"),
      files: [],
      ...(isV2 ? {} : { embeds: [] }),
    });
    try {
      await interaction.message.delete();
    } catch {
      await interaction.editReply(
        textOnly(
          "-# cancelled. i couldn't delete this message, you can delete it yourself"
        )
      );
    }
  }
);

export default CancelInteractionGenericButton;
