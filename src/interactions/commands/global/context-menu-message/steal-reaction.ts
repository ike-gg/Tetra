import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";

import { EmoteListComponent } from "@/components/emote-list.component";
import { Messages } from "@/constants/messages";
import { ContextMenuMessageCommandHandler } from "@/interactions";
import { EmoteStorageService } from "@/services/emote-storage.service";
import { emotesFromReactions } from "@/utils/discord/emotes-from-reactions";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new ContextMenuCommandBuilder()
  .setName("Steal reaction")
  .setType(ApplicationCommandType.Message);

export default new ContextMenuMessageCommandHandler(command, async (interaction) => {
  const feedback = new FeedbackManager(interaction, {
    ephemeral: true,
  });

  await feedback.working();

  const { reactions } = interaction.targetMessage;
  const { username } = interaction.targetMessage.author;
  const emotes = emotesFromReactions(reactions, username);

  if (emotes.length === 0) {
    await feedback.error(Messages.EMOTE_NOT_FOUND);
    return;
  }

  const storageKey = await EmoteStorageService.store(emotes);

  const content = await EmoteListComponent({ storageKey, currentPage: 1 });

  await feedback.sendMessage(content);
});
