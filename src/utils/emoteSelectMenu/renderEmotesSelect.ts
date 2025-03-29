import { EmbedBuilder } from "@discordjs/builders";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { TetraClient, Emote } from "../../types";
import * as TaskTypes from "../../types/TaskTypes";
import emotePreviewEmbed from "../embedMessages/emotePreviewEmbed";

interface EmoteSelectMessage {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>;
}

const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const renderEmotesSelect = (emotes: Emote[], client: TetraClient): EmoteSelectMessage => {
  const selectEmoteActionRow = new ActionRowBuilder<ButtonBuilder>();

  const embeds = emotes.map((emote, index) => {
    const number = emojiNumbers[index];

    const taskId = client.tasks.addTask<TaskTypes.EmotePicker>({
      action: "selectEmote",
      emote,
    });

    selectEmoteActionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(taskId)
        .setEmoji(number)
        .setLabel("Select")
        .setStyle(ButtonStyle.Secondary)
    );

    const { name, author, file } = emote;

    return emotePreviewEmbed({
      number,
      name,
      author: author,
      preview: file.preview,
    });
  });

  return {
    embeds,
    components: selectEmoteActionRow,
  };
};

export default renderEmotesSelect;
