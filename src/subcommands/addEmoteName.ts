import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ActionRowBuilder } from "@discordjs/builders";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";
import messageCreator from "../utils/embedMessages/createEmbed";
import searchEmote from "../api/7tv/searchEmote";

const emojiNumbers = [`1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`, `5️⃣`];

const addEmoteName = async (
  interaction: ChatInputCommandInteraction,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("name")?.value as string;
  const exactmatch = interaction.options.get("exactmatch")?.value as boolean;

  searchEmote(emoteReference, 1, exactmatch)
    .then(async (foundEmotes) => {
      if (foundEmotes.length == 0) {
        await feedback.error(
          `I couldn't find any emotes with \`${emoteReference}\` query.`
        );
        return;
      }

      let buttons = new ActionRowBuilder<ButtonBuilder>();

      const emotesEmbed = foundEmotes.map((emote, index) => {
        const { host, id, name, owner, animated } = emote;
        const number = emojiNumbers[index];

        let previewUrl = `https:${host.url}/2x`;
        animated ? (previewUrl += ".gif") : (previewUrl += ".webp");

        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(
              `selectEmote:${id}:${interaction.user.id}:${
                interaction.guild!.id
              }`
            )
            .setEmoji(number)
            .setLabel("Select")
            .setStyle(ButtonStyle.Secondary)
        );

        return messageCreator.emotePreviewEmbed({
          number,
          name,
          author: owner.display_name,
          reference: id,
          preview: previewUrl,
        });
      });

      const navigatorRow = new ActionRowBuilder<ButtonBuilder>();
      navigatorRow.addComponents(
        new ButtonBuilder()
          .setCustomId("cancelAction")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      );

      //todo
      await feedback.sendMessage({
        embeds: emotesEmbed,
        components: [buttons, navigatorRow],
      });
    })
    .catch(async (error) => {
      await feedback.error(error);
    });
};

export default addEmoteName;
