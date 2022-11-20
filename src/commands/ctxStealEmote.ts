import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesInMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";

import { DiscordBot } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import findCommonGuilds from "../utils/findCommonGuilds";
import getSelectMenuServers from "../utils/elements/getSelectMenuServers";

const ctxStealEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Steal emote")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    const feedback = new FeedbackManager(interaction, { ephemeral: true });
    await feedback.gotRequest();

    const messageContent = interaction.targetMessage.content;
    const emotes = findEmotesFromMessage(messageContent);

    if (emotes.length === 0) {
      await feedback.notFoundEmotes();
      return;
    }

    if (emotes.length > 1) {
      await feedback.moreThanOneEmote();
      return;
    }

    const emote = emotes[0];

    const guildsWithUser = await findCommonGuilds(
      client.guilds.cache,
      interaction.user.id
    );

    if (guildsWithUser.length === 0) {
      feedback.missingCommonGuilds();
      return;
    }

    const taskId = client.tasks.addTask<TaskTypes.StealEmote>({
      action: "stealEmote",
      feedback,
      emote: emote,
    });

    const selectMenuServer = await getSelectMenuServers(taskId, guildsWithUser);

    await feedback.selectServerSteal();
    await feedback.updateComponents([selectMenuServer]);
  },
};

export default ctxStealEmote;

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
