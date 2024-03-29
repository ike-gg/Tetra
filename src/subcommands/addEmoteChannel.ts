import { ChatInputCommandInteraction } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { DiscordBot } from "../types";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import getNavigatorRow from "../utils/elements/getNavigatorRow";
import { EmoteListManager } from "../utils/managers/EmoteListManager";
import * as TaskTypes from "../types/TaskTypes";
import getEmotesFromChannel from "../emotes/source/7tv/stvGetEmotesFromChannel";
import { Messages } from "../constants/messages";
import { TwitchManager } from "../utils/managers/TwitchManager";

const addEmoteChannel = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const channelName = interaction.options.get("channelname")?.value as string;
  const queryString = interaction.options.get("search")?.value as string;

  try {
    const channelInfo = await TwitchManager.getChannel(channelName);

    if (!channelInfo) {
      await feedback.error(Messages.CHANNEL_NOT_FOUND);
      return;
    }

    let foundEmotes = await getEmotesFromChannel(channelInfo.id);

    if (queryString)
      foundEmotes = foundEmotes.filter((emote) =>
        emote.name.toLowerCase().includes(queryString.toLowerCase())
      );

    if (foundEmotes.length === 0) {
      await feedback.error(Messages.EMOTE_NOT_FOUND);
      return;
    }

    const storeId = EmoteListManager.storeEmotes(channelInfo.id, foundEmotes)!;
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

export default addEmoteChannel;
