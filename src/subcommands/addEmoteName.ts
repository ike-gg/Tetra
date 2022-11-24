import { ChatInputCommandInteraction } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import searchEmote from "../api/7tv/searchEmote";
import { DiscordBot } from "../types";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import getNavigatorRow from "../utils/elements/getNavigatorRow";
import { EmoteListManager } from "../utils/managers/EmoteListManager";
import * as TaskTypes from "../types/TaskTypes";

const addEmoteName = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("name")?.value as string;
  let ignoreTags = interaction.options.get("ignoretags")?.value as boolean;

  if (!ignoreTags) ignoreTags = false;

  try {
    const foundEmotes = await searchEmote(emoteReference, ignoreTags);

    console.log(foundEmotes);

    if (foundEmotes.length === 0) {
      await feedback.notFoundEmotesQuery(emoteReference);
      return;
    }

    const storeId = EmoteListManager.storeEmotes(emoteReference, foundEmotes)!;
    const pagesOfEmotes = EmoteListManager.getEmotesInPages(storeId, 1)!;
    const storeInfo = EmoteListManager.getStoredInfo(storeId)!;

    const emotesEmbedsPreview = renderEmotesSelect(pagesOfEmotes, client);

    const navigatorTask = client.tasks.addTask<TaskTypes.EmoteNavigator>({
      action: "navigatorPage",
      feedback: feedback,
      interaction: interaction,
      multiAdd: false,
      currentPage: 1,
      totalPages: storeInfo.pages,
      storeId,
    });

    const navigatorRow = getNavigatorRow(navigatorTask, client, {
      nextDisabled: storeInfo.pages === 1,
      previousDisabled: true,
    });

    await feedback.sendMessage({
      components: [emotesEmbedsPreview.components, navigatorRow],
      embeds: emotesEmbedsPreview.embeds,
    });
  } catch (error) {
    await feedback.error(String(error));
  }
};

export default addEmoteName;
