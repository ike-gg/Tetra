import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesInMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";

import { DiscordBot, Emote } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import findCommonGuilds from "../utils/findCommonGuilds";
import getSelectMenuServers from "../utils/elements/getSelectMenuServers";
import emotesFromReactions from "../utils/emotesFromReactions";
import { EmoteListManager } from "../utils/managers/EmoteListManager";
import renderEmotesSelect from "../utils/emoteSelectMenu/renderEmotesSelect";
import getNavigatorRow from "../utils/elements/getNavigatorRow";

const ctxStealReaction = {
  data: new ContextMenuCommandBuilder()
    .setName("Steal reaction")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    const feedback = new FeedbackManager(interaction, { ephemeral: true });
    await feedback.gotRequest();

    const { reactions } = interaction.targetMessage;
    const { username } = interaction.targetMessage.author;
    const emotes = emotesFromReactions(reactions, username);

    if (emotes.length === 0) {
      await feedback.notFoundReactions();
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
  },
};

export default ctxStealReaction;

// finding common servers based on cached guilds
//
// const filteregGuilds = client.guilds.cache
//   .filter((guild) => guild.members.cache.get(interaction.user.id))
//   .filter((guild) => {
//     const userInGuild = guild.members.cache.get(interaction.user.id);
//     if (!userInGuild) return false;
//     const userHasPermissions = userInGuild.permissions.has(
//       "ManageEmojisAndStickers"
//     );
//     return userHasPermissions;
//   })
//   .map((guild) => guild);
