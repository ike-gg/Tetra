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

    if (foundEmotes.length === 0) {
      await feedback.error(
        `Nothing found with \`${emoteReference}\` query\n\n**Some emotes are indexed as unlisted, which means that they can't be searched using this method, use \`/addemote bylink\` instead.** \n\n\n_HINT: If you want to add emote from chat, right click on it and select "Copy image address" and paste it as link value to \`/addemote bylink\` command._`
      );
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
