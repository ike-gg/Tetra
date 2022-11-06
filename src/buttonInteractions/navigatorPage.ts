import { ButtonInteraction } from "discord.js";
import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import searchEmote from "../api/7tv/searchEmote";
import getNavigatorRow from "../utils/emoteSelectMenu/getNavigatorRow";

const navigatorPage = {
  data: { name: "navigatorPage" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);
    await feedback.gotRequest();
    await feedback.removeButtons();
    try {
      const interationArguments = interaction.customId.split(":");
      const [taskId, action] = interationArguments;

      const taskDetails = client.tasks.getTask(taskId);
      const { currentPage, pagesLimit } = taskDetails!.options!;
      const { emoteReference } = taskDetails!;

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

      const foundEmotes = await searchEmote(emoteReference!, newPage);

      const emotesEmbedsPreview = renderEmotesSelect(foundEmotes, client);
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
