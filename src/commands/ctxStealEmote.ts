import {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  Guild,
  MessageContextMenuCommandInteraction,
  SelectMenuBuilder,
} from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesFromMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";
import emoteDiscord from "../emotes/emoteDiscord";

import { DiscordBot, ExtractedEmote } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import findCommonGuilds from "../utils/findCommonGuilds";

const ctxStealEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Steal emote")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    const feedback = new FeedbackManager(interaction, true);
    await feedback.gotRequest();

    const messageContent = interaction.targetMessage.content;
    const emotes = findEmotesFromMessage(messageContent);

    if (emotes.length === 0) {
      await feedback.error("No emotes found in message.");
      return;
    }

    if (emotes.length > 1) {
      await feedback.error(
        "Messages includes more than 1 emote is not supported yet."
      );
      return;
    }

    const guildsWithUser = await findCommonGuilds(
      client.guilds.cache,
      interaction.user.id
    );

    if (guildsWithUser.length === 0) {
      feedback.error(
        "I don't see our common servers, are you sure you invited me to the server you want to add emotes and have permissions to manage emotes?"
      );
      return;
    }

    const emote = emotes[0];

    if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
      await feedback.error("This emote is from this server.");
      return;
    }

    const taskId = client.tasks.addTask<TaskTypes.StealEmote>({
      action: "stealEmote",
      id: "",
      emote: emote,
    });

    const row = new ActionRowBuilder<SelectMenuBuilder>();
    const menu = new SelectMenuBuilder()
      .setCustomId(taskId)
      .setPlaceholder("Select server");

    guildsWithUser.forEach((guild) => {
      menu.addOptions({
        label: guild.name,
        value: guild.id,
      });
    });

    row.addComponents(menu);

    await feedback.success(
      "Success!",
      "Select where you'd like to import emote!"
    );
    await feedback.sendMessage({ components: [row] });

    // try {
    //   const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;

    //   const addedEmote = await interaction.guild?.emojis.create({
    //     attachment: extractedEmote.image,
    //     name: extractedEmote.name,
    //   });

    //   await feedback.success(
    //     `Success!`,
    //     `Successfully added \`${addedEmote?.name}\` emote! ${addedEmote}`,
    //     extractedEmote.preview
    //   );
    // } catch (error: any) {
    //   await feedback.error(error);
    // }
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
