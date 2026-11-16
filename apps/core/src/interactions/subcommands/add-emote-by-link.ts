import type { ChatInputCommandInteraction } from "discord.js";

import { EmbeddedError } from "@/constants/errors";
import { prepareEmote } from "@/emotes/prepare-emote";
import stvGetEmoteById from "@/emotes/source/7tv/stv-get-emote-by-id";
import bttvGetEmoteById from "@/emotes/source/bttv/bttv-get-emote-by-id";
import ffzGetEmoteById from "@/emotes/source/ffz/ffz-get-emote-by-id";
import getEmoteFromUrl from "@/emotes/source/file/get-emote-from-url";
import { parseEmoteLink } from "@/emotes/source/parse-emote-link";
import type { Emote } from "@/types";
import isValidURL from "@/utils/is-valid-url";
import type { FeedbackManager } from "@/utils/managers/feedback-manager";

export const addEmoteLink = async (
  interaction: ChatInputCommandInteraction,
  feedback: FeedbackManager
) => {
  const emoteUrl = interaction.options.getString("link")!;

  if (!isValidURL(emoteUrl)) {
    await feedback.invalidReference();
    return;
  }

  let emote: Emote | null = null;

  const emoteURL = new URL(emoteUrl);

  const cantFindReference = new EmbeddedError(
    "i couldn't find an emote at that link. check that it points to a single emote on 7TV, BTTV or FFZ"
  );

  try {
    const link = parseEmoteLink(emoteURL);

    // Discord emojis and Twitch emotes are plain image links for the bot
    if (
      link?.provider === "7tv" ||
      link?.provider === "ffz" ||
      link?.provider === "bttv"
    ) {
      if (!link.id) throw cantFindReference;

      if (link.provider === "7tv") emote = await stvGetEmoteById(link.id);
      else if (link.provider === "ffz") emote = await ffzGetEmoteById(link.id);
      else emote = await bttvGetEmoteById(link.id);
    } else {
      emote = await getEmoteFromUrl(emoteUrl);
    }

    if (!emote) {
      await feedback.invalidReference();
      return;
    }

    await prepareEmote({ emote, feedback });
  } catch (error) {
    await feedback.handleError(error);
  }
};
