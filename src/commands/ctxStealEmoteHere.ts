import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesInMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";
import emoteDiscord from "../emotes/emoteDiscord";

import { DiscordBot, ExtractedEmote } from "../types";
import editEmoteByUser from "../emotes/editEmoteByUser";

const ctxStealEmoteHere = {
  data: new ContextMenuCommandBuilder()
    .setName("Steal emote here")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    const feedback = new FeedbackManager(interaction);

    if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      await feedback.missingPermissions();
      return;
    }

    const messageContent = interaction.targetMessage.content;
    const emotes = findEmotesFromMessage(messageContent);

    if (emotes.length === 0) {
      await feedback.notFoundEmotes();
      return;
    }

    await feedback.gotRequest();

    if (emotes.length > 1) {
      await feedback.moreThanOneEmote();
      return;
    }

    const emote = emotes[0];

    if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
      await feedback.emoteSameServer();
      return;
    }

    try {
      const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;
      const { guild } = interaction;

      await editEmoteByUser(extractedEmote, guild!, { client, feedback });
    } catch (error: any) {
      await feedback.error(error);
    }
  },
};

export default ctxStealEmoteHere;
