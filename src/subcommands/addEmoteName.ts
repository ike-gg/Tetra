import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ActionRowBuilder } from "@discordjs/builders";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";
import messageCreator from "../utils/embedMessages/createEmbed";
import searchEmote from "../api/7tv/searchEmote";
import { DiscordBot } from "../types";

const emojiNumbers = [`1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`, `5️⃣`];

const addEmoteName = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("name")?.value as string;
  const exactmatch = interaction.options.get("exactmatch")?.value as boolean;

  try {
    const foundEmotes = await searchEmote(emoteReference, 1, exactmatch);
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

      const taskId = client.tasks.addTask({
        action: "selectEmote",
        emoteReference: id,
      });

      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(taskId)
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
        .setCustomId("pageid")
        .setLabel("Page 1/50")
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
      embeds: emotesEmbed,
      components: [buttons, navigatorRow],
    });
  } catch (error) {
    await feedback.error(String(error).slice(0, 300));
  }
};

export default addEmoteName;
