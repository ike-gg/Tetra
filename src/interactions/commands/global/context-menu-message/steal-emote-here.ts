import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";

import { Messages } from "@/constants/messages";
import { prepareEmote } from "@/emotes/prepare-emote";
import { ContextMenuMessageCommandHandler } from "@/interactions";
import findEmotesInMessage from "@/utils/discord/findEmotesInMessage";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new ContextMenuCommandBuilder()
  .setName("Steal emote here")
  .setType(ApplicationCommandType.Message);

export default new ContextMenuMessageCommandHandler(command, async (interaction) => {
  const feedback = new FeedbackManager(interaction, {
    ephemeral: true,
  });

  await feedback.working();

  if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
    await feedback.missingPermissions();
    return;
  }

  const messageContent = interaction.targetMessage.content;
  const { username } = interaction.targetMessage.author;
  const emotes = findEmotesInMessage(messageContent, username);

  if (emotes.length === 0) {
    await feedback.notFoundEmotes();
    return;
  }

  if (emotes.length > 1) {
    await feedback.error(Messages.MULTIPLE_EMOTES_NOT_SUPPORTED);
    return;
  }

  const emote = emotes[0];

  await prepareEmote({ emote, feedback });
});
