import {
  ActionRowBuilder,
  ApplicationCommandType,
  ComponentType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputComponent,
  TextInputStyle,
} from "discord.js";

import { DiscordBot } from "../types";
import { parseEntitlementsData } from "../utils/parseEntitlementsData";

const stringEmotes = (text: string) => {
  const letterEmotes: Record<string, string> = {
    A: "🇦",
    B: "🇧",
    C: "🇨",
    D: "🇩",
    E: "🇪",
    F: "🇫",
    G: "🇬",
    H: "🇭",
    I: "🇮",
    J: "🇯",
    K: "🇰",
    L: "🇱",
    M: "🇲",
    N: "🇳",
    O: "🇴",
    P: "🇵",
    Q: "🇶",
    R: "🇷",
    S: "🇸",
    T: "🇹",
    U: "🇺",
    V: "🇻",
    W: "🇼",
    X: "🇽",
    Y: "🇾",
    Z: "🇿",
  };

  return text
    .split("")
    .map((letter) => {
      const uppercase = letter.toUpperCase();
      return letterEmotes[uppercase] || undefined;
    })
    .filter((n) => n) as string[];
};

const ctxStealReaction = {
  data: new ContextMenuCommandBuilder()
    .setName("Text reaction")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    const { purchasedEntitlement } = parseEntitlementsData(interaction);

    if (!purchasedEntitlement) {
      await interaction.sendPremiumRequired();
      return;
    }

    const { targetMessage } = interaction;

    const modal = new ModalBuilder()
      .setCustomId(interaction.id)
      .setTitle("Input text");

    const textInput = new TextInputBuilder()
      .setCustomId("input")
      .setLabel("Text")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(16)
      .setMinLength(1);

    const actionRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        textInput
      );

    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 5,
      filter: (i) => i.user.id === interaction.user.id,
    });

    if (!submitted) return;

    const text = submitted.fields.getField("input", ComponentType.TextInput);

    if (!text) await submitted.reply("Invalid text");

    const emotes = stringEmotes(text.value);

    emotes.forEach(async (emote) => {
      try {
        await targetMessage.react(emote);
      } catch (error) {}
    });

    await submitted.reply({
      ephemeral: true,
      content: "<a:ladrillo:1177449422028816554>",
    });
  },
};

export default ctxStealReaction;
