import { ButtonInteraction } from "discord.js";
import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import searchEmote from "../api/7tv/searchEmote";
import getNavigatorRow from "../utils/emoteSelectMenu/getNavigatorRow";
import { EmoteListManager } from "../utils/managers/EmoteListManager";

const navigatorPage = {
  data: { name: "navigatorPage" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);
    await feedback.gotRequest();
    await feedback.removeButtons();
    try {
      const interationArguments = interaction.customId.split(":");
      const [taskId, action] = interationArguments;

      const taskDetails = client.tasks.getTask(taskId)!;
      const { currentPage, pagesLimit } = taskDetails.options!;
      const { storeId } = taskDetails;

      let pageDirection: number;
      action === "previous" ? (pageDirection = -1) : (pageDirection = 1);
      const newPage = currentPage! + pageDirection;

      client.tasks.updateCurrentPage(taskId, newPage);

      let nextDisabled = false;
      let previousDisabled = false;

      if (newPage >= pagesLimit!) {
        nextDisabled = true;
      }

      if (newPage <= 1) {
        previousDisabled = true;
      }

      const emotePage = EmoteListManager.getEmotesInPages(storeId!, newPage)!;

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
      feedback.error(String(error));
    }
  },
};

export default navigatorPage;
