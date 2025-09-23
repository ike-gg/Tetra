import { ChatInputCommandInteraction } from "discord.js";

import { EmoteListComponent } from "@/components/emote-list.component";
import { Messages } from "@/constants/messages";
import stvGetEmotesByQuery from "@/emotes/source/7tv/stvGetEmotesByQuery";
import bttvGetEmotesByQuery from "@/emotes/source/bttv/bttvGetEmotesByQuery";
import ffzGetEmotesByQuery from "@/emotes/source/ffz/ffzGetEmotesByQuery";
import { EmoteStorageService } from "@/services/emote-storage.service";
import { Emote } from "@/types";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

export const addEmoteName = async (
  interaction: ChatInputCommandInteraction,
  feedback: FeedbackManager
) => {
  const emoteQuery = interaction.options.getString("name");
  const source = interaction.options.getString("source");

  if (!emoteQuery) {
    return;
  }

  try {
    let foundEmotes: Emote[];

    if (source === "bttv") {
      foundEmotes = await bttvGetEmotesByQuery(emoteQuery);
    } else if (source === "ffz") {
      foundEmotes = await ffzGetEmotesByQuery(emoteQuery);
    } else {
      foundEmotes = await stvGetEmotesByQuery(emoteQuery);
    }

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
