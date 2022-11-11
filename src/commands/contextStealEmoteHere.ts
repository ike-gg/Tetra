import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesFromMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";
import emoteDiscord from "../emotes/emoteDiscord";

import { ExtractedEmote } from "../types";

const importEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Steal emote here")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const feedback = new FeedbackManager(interaction);
    await feedback.gotRequest();

    const messageContent = interaction.targetMessage.content;
    const emotes = findEmotesFromMessage(messageContent);

    if (interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      await feedback.missingPermissions();
      return;
    }

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

    if (emotes.length === 1) {
      const emote = emotes[0];

      if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
        await feedback.error("This emote is from this server.");
        return;
      }

      try {
        const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;

        const addedEmote = await interaction.guild?.emojis.create({
          attachment: extractedEmote.image,
          name: extractedEmote.name,
        });

        await feedback.success(
          `Success!`,
          `Successfully added \`${addedEmote?.name}\` emote! ${addedEmote}`,
          extractedEmote.preview
        );
      } catch (error: any) {
        await feedback.error(error);
      }
    }
  },
};

export default importEmote;
