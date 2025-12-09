import { ChatInputCommandInteraction } from "discord.js";

import { EmbeddedError } from "@/constants/errors";
import { prepareEmote } from "@/emotes/prepare-emote";
import stvGetEmoteById from "@/emotes/source/7tv/stvGetEmoteById";
import bttvGetEmoteById from "@/emotes/source/bttv/bttvGetEmoteById";
import ffzGetEmoteById from "@/emotes/source/ffz/ffzGetEmoteById";
import getEmoteFromUrl from "@/emotes/source/file/getEmoteFromUrl";
import { Emote } from "@/types";
import isValidURL from "@/utils/isValidURL";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

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
  const domain = emoteURL.hostname.toLowerCase();

  const cantFindReference = new EmbeddedError({
    title: "Cant find reference",
    description:
      "Link to the emote is from known source, but we couldn't find the emote. Maybe link include invalid characters or is not a valid emote link.",
  });

  try {
    if (domain.includes("7tv")) {
      const match = emoteUrl.match(/\/([a-zA-Z0-9]{24,30})(?:[^\w]|$)/);
      const emoteId = match?.[1] ?? null;

      if (!emoteId) throw cantFindReference;

      emote = await stvGetEmoteById(emoteId);
    } else if (domain.includes("frankerfacez")) {
      const emoteId = emoteUrl
        .split("/")
        .map((path) => parseInt(path, 10))
        .filter((num) => !isNaN(num))
        .sort((a, b) => b - a)[0];

      if (!emoteId) throw cantFindReference;

      emote = await ffzGetEmoteById(String(emoteId));
    } else if (domain.includes("betterttv")) {
      const emoteId = emoteUrl.split("/").find((path) => path.length === 24);

      if (!emoteId) throw cantFindReference;

      emote = await bttvGetEmoteById(emoteId);
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
