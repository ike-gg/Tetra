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
import getNavigatorRow from "../utils/emoteSelectMenu/getNavigatorRow";

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

    const emotesFound = foundEmotes[0].count;
    const pages = Math.ceil(emotesFound / 5);

    const navigatorTask = client.tasks.addTask({
      action: "navigatorPage",
      feedback: feedback,
      interaction: interaction,
      emoteReference: emoteReference,
      options: {
        currentPage: 1,
        pagesLimit: pages,
      },
    });

    const navigatorRow = getNavigatorRow(navigatorTask, client, {
      nextDisabled: false,
      previousDisabled: true,
    });

    await feedback.sendMessage({
      components: [emotesEmbedsPreview.components, navigatorRow],
      embeds: emotesEmbedsPreview.embeds,
    });
  } catch (error) {
    await feedback.error(String(error).slice(0, 300));
  }
};

export default addEmoteName;
