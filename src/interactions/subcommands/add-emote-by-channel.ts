import { ChatInputCommandInteraction } from "discord.js";

import { EmoteListComponent } from "@/components/emote-list.component";
import { Messages } from "@/constants/messages";
import stvGetEmotesFromChannel from "@/emotes/source/7tv/stvGetEmotesFromChannel";
import { EmoteStorageService } from "@/services/emote-storage.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";
import { TwitchManager } from "@/utils/managers/TwitchManager";

export const addEmoteChannel = async (
  interaction: ChatInputCommandInteraction,
  feedback: FeedbackManager
) => {
  const channelName = interaction.options.get("channel")?.value as string;
  const queryString = interaction.options.get("search")?.value as string;

  try {
    const channelInfo = await TwitchManager.getChannel(channelName);

    if (!channelInfo) {
      await feedback.error(Messages.CHANNEL_NOT_FOUND);
      return;
    }

    let foundEmotes = await stvGetEmotesFromChannel(channelInfo.id);

    if (queryString)
      foundEmotes = foundEmotes.filter((emote) =>
        emote.name.toLowerCase().includes(queryString.toLowerCase())
      );

    if (foundEmotes.length === 0) {
      await feedback.error(Messages.EMOTE_NOT_FOUND);
      return;
    }

    const storageKey = await EmoteStorageService.store(foundEmotes);

    const content = await EmoteListComponent({ storageKey, currentPage: 1 });

    await feedback.sendMessage(content);
  } catch (error) {
    await feedback.handleError(error);
  }
};
