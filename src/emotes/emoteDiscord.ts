import { ExtractedEmote, FoundEmotesDiscord } from "../types";
import getRawEmote from "./source/discord/getRawEmote";

import emoteOptimise from "./emoteOptimise";

const emoteDiscord = async (
  emote: FoundEmotesDiscord
): Promise<ExtractedEmote> => {
  try {
    const rawEmote = await getRawEmote(emote.link);
    const rawEmoteBuffer = Buffer.from(rawEmote!);

    const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
      animated: emote.animated,
      feedback: emote.feedback,
    });

    return {
      name: emote.name,
      data: rawEmoteBuffer,
      finalData: emoteBuffer,
      author: "Discord",
      file: {
        url: emote.link,
        preview: emote.link,
      },
      id: emote.id,
      animated: emote.animated,
      origin: "discord",
    };
  } catch (error) {
    throw new Error(String(error));
  }
};

export default emoteDiscord;
