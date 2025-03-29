import { ButtonInteraction } from "discord.js";

import { TetraClient } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import getNavigatorRow from "../utils/elements/getNavigatorRow";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import { EmoteListManager } from "../utils/managers/EmoteListManager";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const navigatorPage = {
  data: {
    name: "navigatorPage",
  },
  async execute(interaction: ButtonInteraction, client: TetraClient) {
    const feedback = new FeedbackManager(interaction);

    await feedback.removeComponents();
    await feedback.working();

    try {
      const interationArguments = interaction.customId.split(":");
      const [taskId, action] = interationArguments;

      const taskDetails = client.tasks.getTask<TaskTypes.EmoteNavigator>(taskId)!;
      const { currentPage, totalPages, storeId } = taskDetails;

      let pageDirection: number;
      action === "previous" ? (pageDirection = -1) : (pageDirection = 1);
      const newPage = currentPage + pageDirection;

      client.tasks.updateCurrentPage(taskId, newPage);

      let nextDisabled = false;
      let previousDisabled = false;

      if (newPage >= totalPages!) {
        nextDisabled = true;
      }

      if (newPage <= 1) {
        previousDisabled = true;
      }

      const emotePage = EmoteListManager.getEmotesInPages(storeId, newPage)!;

      const emotesEmbedsPreview = renderEmotesSelect(emotePage, client);
      const navigatorRow = getNavigatorRow(taskId, client, {
        nextDisabled,
        previousDisabled,
      });

      feedback.sendMessage({
        embeds: emotesEmbedsPreview.embeds,
        components: [emotesEmbedsPreview.components, navigatorRow],
      });
    } catch (error) {
      await feedback.handleError(error);
    }
  },
};

export default navigatorPage;
