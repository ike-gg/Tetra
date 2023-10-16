import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesInMessage";

import { DiscordBot } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import findCommonGuilds from "../utils/findCommonGuilds";
import getSelectMenuServers from "../utils/elements/getSelectMenuServers";
import { Messages } from "../constants/messages";

const ctxStealEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Steal emote")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    const feedback = new FeedbackManager(interaction, { ephemeral: true });
    await feedback.warning(
      "Indexing common guilds... it could take a while..."
    );

    const messageContent = interaction.targetMessage.content;
    const { username } = interaction.targetMessage.author;
    const emotes = findEmotesFromMessage(messageContent, username);

    if (emotes.length === 0) {
      await feedback.error(Messages.EMOTE_NOT_FOUND);
      return;
    }

    if (emotes.length > 1) {
      await feedback.error(Messages.MULTIPLE_EMOTES_NOT_SUPPORTED);
      return;
    }

    const emote = emotes[0];

    const guildsWithUser = await findCommonGuilds(
      client.guilds.cache,
      interaction.user.id
    );

    if (guildsWithUser.length === 0) {
      feedback.error(Messages.NO_COMMON_SERVERS_PERMISSIONS);
      return;
    }

    const taskId = client.tasks.addTask<TaskTypes.StealEmote>({
      action: "stealEmote",
      feedback,
      emote,
    });

    const selectMenuServer = await getSelectMenuServers(taskId, guildsWithUser);

    await feedback.success({
      title: "Got it!",
      description:
        "Now select server where you'd like to import emote.\n\nKeep in mind I must be on this server and YOU must have permission to add emotes there.",
    });
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
