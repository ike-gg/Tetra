import { EmbedBuilder } from "@discordjs/builders";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import SelectEmoteButtonInteractionHandler from "@/interactions/buttons/global/select-emote";

import { TetraClient, Emote } from "../../types";
import emotePreviewEmbed from "../embedMessages/emotePreviewEmbed";

interface EmoteSelectMessage {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>;
}

const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const renderEmotesSelect = async (
  emotes: Emote[],
  _: TetraClient
): Promise<EmoteSelectMessage> => {
  const selectEmoteActionRow = new ActionRowBuilder<ButtonBuilder>();

  const components = await Promise.all(
    emotes.map(async (emote, index) => {
      const number = emojiNumbers[index];

      const { buttonId } = await SelectEmoteButtonInteractionHandler.create({ emote });

      const button = new ButtonBuilder()
        .setCustomId(buttonId)
        .setEmoji(number)
        .setLabel("Select")
        .setStyle(ButtonStyle.Secondary);

      const { name, author, file } = emote;

      return {
        button,
        embed: emotePreviewEmbed({
          number,
          name,
          author: author,
          preview: file.preview,
        }),
      };
    })
  );

  components.forEach((component) => {
    selectEmoteActionRow.addComponents(component.button);
  });

  return {
    embeds: components.map((component) => component.embed),
    components: selectEmoteActionRow,
  };
};

export default renderEmotesSelect;
