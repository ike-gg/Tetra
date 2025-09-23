import { ChatInputCommandInteraction } from "discord.js";

import { EmoteListComponent } from "@/components/emote-list.component";
import { Messages } from "@/constants/messages";
import { EmoteStorageService } from "@/services/emote-storage.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";
import { TwitchManager } from "@/utils/managers/TwitchManager";

const addSubEmoteChannel = async (
  interaction: ChatInputCommandInteraction,
  feedback: FeedbackManager
) => {
  const channelName = interaction.options.getString("channel");

  if (!channelName) return;

  try {
    const channelInfo = await TwitchManager.getChannel(channelName);

    if (!channelInfo) {
      await feedback.error(Messages.CHANNEL_NOT_FOUND);
      return;
    }

    const foundEmotes = await TwitchManager.getChannelEmotes(channelInfo.id);

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

export default addSubEmoteChannel;
