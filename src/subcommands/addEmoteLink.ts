import { FeedbackManager } from "../utils/managers/FeedbackManager";

import { DiscordBot, Emote } from "../types";
import isValidURL from "../utils/isValidURL";
import ffzGetEmoteById from "../emotes/source/ffz/ffzGetEmoteById";
import stvGetEmoteById from "../emotes/source/7tv/stvGetEmoteById";
import bttvGetEmoteById from "../emotes/source/bttv/bttvGetEmoteById";
import prepareEmote from "../emotes/prepareEmote";
import getSourceFile from "../emotes/source/file/getSourceFile";
import { ChatInputCommandInteraction } from "discord.js";

const addEmoteLink = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
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

  try {
    if (domain.includes("7tv")) {
      const emoteId = emoteUrl.split("/").find((path) => path.length === 24);
      if (!emoteId) return;

      emote = await stvGetEmoteById(emoteId);
    } else if (domain.includes("frankerfacez")) {
      const emoteId = emoteUrl
        .split("/")
        .map((path) => parseInt(path, 10))
        .filter((num) => !isNaN(num))
        .sort((a, b) => b - a)[0];
      if (!emoteId) return;

      emote = await ffzGetEmoteById(String(emoteId));
    } else if (domain.includes("betterttv")) {
      const emoteId = emoteUrl.split("/").find((path) => path.length === 24);
      if (!emoteId) return;

      emote = await bttvGetEmoteById(emoteId);
    } else {
      emote = await getSourceFile(emoteUrl);
    }

    if (!emote) {
      await feedback.invalidReference();
      return;
    }

    prepareEmote(emote, { feedback, interaction });
  } catch (error) {
    await feedback.error(String(error));
  }
};

export default addEmoteLink;
