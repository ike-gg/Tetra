import { Guild } from "discord.js";
import { ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const addEmoteToGuild = async (
  emote: ExtractedEmote,
  guild: Guild,
  feedback: FeedbackManager
) => {
  try {
    await feedback.removeButtons();
    const addedEmote = await guild.emojis.create({
      attachment: emote.finalData,
      name: emote.name,
    });
    await feedback.successedAddedEmote(addedEmote);
  } catch (error) {
    throw new Error(String(error));
  }
};

export default addEmoteToGuild;
