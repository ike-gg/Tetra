import { EmbedBuilder } from "@discordjs/builders";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EmoteGQL } from "../../api/7tv/apiResponseType";
import { DiscordBot } from "../../types";
import emotePreviewEmbed from "../embedMessages/emotePreviewEmbed";
import * as TaskTypes from "../../types/TaskTypes";

interface EmoteSelectMessage {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>;
}

const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const renderEmotesSelect = (
  emotes: EmoteGQL[],
  client: DiscordBot
): EmoteSelectMessage => {
  const selectEmoteActionRow = new ActionRowBuilder<ButtonBuilder>();

  const embeds = emotes.map((emote, index) => {
    const { host, name, owner, animated, id } = emote;
    const number = emojiNumbers[index];

    let previewUrl = `https:${host.url}/2x`;
    animated ? (previewUrl += ".gif") : (previewUrl += ".webp");

    const taskId = client.tasks.addTask<TaskTypes.EmotePicker>({
      action: "selectEmote",
      emoteReference: id,
    });

    selectEmoteActionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(taskId)
        .setEmoji(number)
        .setLabel("Select")
        .setStyle(ButtonStyle.Secondary)
    );

    return emotePreviewEmbed({
      number,
      name,
      author: owner.display_name,
      preview: previewUrl,
    });
  });

  return {
    embeds,
    components: selectEmoteActionRow,
  };
};

export default renderEmotesSelect;
