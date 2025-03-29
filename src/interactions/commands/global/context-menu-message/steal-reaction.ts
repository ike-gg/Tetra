import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";

import { Messages } from "@/constants/messages";
import { ContextMenuMessageCommandHandler } from "@/interactions";
import * as TaskTypes from "@/types/TaskTypes";
import emotesFromReactions from "@/utils/discord/emotesFromReactions";
import getNavigatorRow from "@/utils/elements/getNavigatorRow";
import renderEmotesSelect from "@/utils/emoteSelectMenu/renderEmotesSelect";
import { EmoteListManager } from "@/utils/managers/EmoteListManager";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new ContextMenuCommandBuilder()
  .setName("Steal reaction")
  .setType(ApplicationCommandType.Message);

export default new ContextMenuMessageCommandHandler(
  command,
  async (interaction, client) => {
    const feedback = new FeedbackManager(interaction, {
      ephemeral: true,
    });
    await feedback.working();

    const { reactions } = interaction.targetMessage;
    const { username } = interaction.targetMessage.author;
    const emotes = emotesFromReactions(reactions, username);

    if (emotes.length === 0) {
      await feedback.error(Messages.EMOTE_NOT_FOUND);
      return;
    }

    const storeId = EmoteListManager.storeEmotes("steal reaction", emotes)!;

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
  }
);
