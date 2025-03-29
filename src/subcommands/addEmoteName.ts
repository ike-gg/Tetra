import { ChatInputCommandInteraction } from "discord.js";

import { Messages } from "../constants/messages";
import stvGetEmotesByQuery from "../emotes/source/7tv/stvGetEmotesByQuery";
import bttvGetEmotesByQuery from "../emotes/source/bttv/bttvGetEmotesByQuery";
import ffzGetEmotesByQuery from "../emotes/source/ffz/ffzGetEmotesByQuery";
import { TetraClient, Emote } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import getNavigatorRow from "../utils/elements/getNavigatorRow";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import { EmoteListManager } from "../utils/managers/EmoteListManager";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const addEmoteName = async (
  interaction: ChatInputCommandInteraction,
  client: TetraClient,
  feedback: FeedbackManager
) => {
  const emoteQuery = interaction.options.getString("name");
  const source = interaction.options.getString("source");

  if (!emoteQuery) {
    return;
  }

  try {
    let foundEmotes: Emote[];

    if (source === "bttv") {
      foundEmotes = await bttvGetEmotesByQuery(emoteQuery);
    } else if (source === "ffz") {
      foundEmotes = await ffzGetEmotesByQuery(emoteQuery);
    } else {
      foundEmotes = await stvGetEmotesByQuery(emoteQuery);
    }

    if (foundEmotes.length === 0) {
      await feedback.error(Messages.EMOTE_NOT_FOUND);
      return;
    }

    const storeId = EmoteListManager.storeEmotes(emoteQuery, foundEmotes)!;
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
    await feedback.handleError(error);
  }
};

export default addEmoteName;
