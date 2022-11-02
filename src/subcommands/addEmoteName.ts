import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ActionRowBuilder } from "@discordjs/builders";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import messageCreator from "../utils/embedMessages/createEmbed";
import searchEmote from "../api/7tv/searchEmote";
import { DiscordBot } from "../types";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";

const emojiNumbers = [`1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`, `5️⃣`];

const addEmoteName = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("name")?.value as string;
  const exactmatch = interaction.options.get("exactmatch")?.value as boolean;

  try {
    const foundEmotes = await searchEmote(emoteReference, 1);

    if (foundEmotes.length == 0) {
      await feedback.error(
        `I couldn't find any emotes with \`${emoteReference}\` query.`
      );
      return;
    }

    const emotesEmbedsPreview = renderEmotesSelect(foundEmotes, client);

    // const emotesEmbed = foundEmotes.map((emote, index) => {
    //   const { host, id, name, owner, animated } = emote;
    //   const number = emojiNumbers[index];

    //   let previewUrl = `https:${host.url}/2x`;
    //   animated ? (previewUrl += ".gif") : (previewUrl += ".webp");

    //   const taskId = client.tasks.addTask({
    //     action: "selectEmote",
    //     emoteReference: id,
    //   });

    //   buttons.addComponents(
    //     new ButtonBuilder()
    //       .setCustomId(taskId)
    //       .setEmoji(number)
    //       .setLabel("Select")
    //       .setStyle(ButtonStyle.Secondary)
    //   );

    //   return messageCreator.emotePreviewEmbed({
    //     number,
    //     name,
    //     author: owner.display_name,
    //     reference: id,
    //     preview: previewUrl,
    //   });
    // });

    const emotesFound = foundEmotes[0].count;
    const pages = Math.ceil(emotesFound / 5);

    const navigatorRow = new ActionRowBuilder<ButtonBuilder>();
    navigatorRow.addComponents(
      new ButtonBuilder()
        .setCustomId("pageid")
        .setLabel(`Page 1/${pages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    navigatorRow.addComponents(
      new ButtonBuilder()
        .setCustomId("previouspage")
        .setLabel("Previous")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Primary)
    );
    navigatorRow.addComponents(
      new ButtonBuilder()
        .setCustomId("nextpage")
        .setLabel("Next")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Primary)
    );
    navigatorRow.addComponents(
      new ButtonBuilder()
        .setCustomId("fjute")
        .setLabel(client.tasks.addTask({ action: "jebanie" }))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    navigatorRow.addComponents(
      new ButtonBuilder()
        .setCustomId("cancelAction")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    //todo
    await feedback.sendMessage({
      components: [emotesEmbedsPreview.components, navigatorRow],
      embeds: emotesEmbedsPreview.embeds,
    });
  } catch (error) {
    await feedback.error(String(error).slice(0, 300));
  }
};

export default addEmoteName;
