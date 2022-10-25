import { ExtractedEmote, FoundEmotesDiscord } from "../types";
import getRawEmote from "../api/discord/getRawEmote";

import emoteOptimise from "./emoteOptimise";

type ExtractEmote = FoundEmotesDiscord[] | FoundEmotesDiscord;
type ReturnEmote = ExtractedEmote[] | ExtractedEmote;

const emoteDiscord = async (emote: ExtractEmote) => {
  return new Promise<ReturnEmote>(async (resolve, reject) => {
    if (!Array.isArray(emote)) {
      try {
        const rawEmote = await getRawEmote(emote.link);
        const rawEmoteBuffer = Buffer.from(rawEmote!);

        const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
          animated: emote.animated,
          feedback: emote.feedback,
        });

        resolve({
          name: emote.name,
          image: emoteBuffer,
          preview: emote.link,
          id: emote.id,
        });
      } catch (error) {
        console.error(error);
        reject("Emote not found.");
      }
    }

    if (Array.isArray(emote)) {
      try {
        const extractedEmotes = await Promise.all(
          emote.map(async (singleEmote) => {
            const rawEmote = await getRawEmote(singleEmote.link);
            const rawEmoteBuffer = Buffer.from(rawEmote);

            const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
              animated: singleEmote.animated,
              feedback: singleEmote.feedback,
            });

            return {
              name: singleEmote.name,
              image: emoteBuffer,
              preview: singleEmote.link,
              id: singleEmote.id,
            };
          })
        );
        resolve(extractedEmotes);
      } catch (error) {
        console.error(error);
        reject("Emote not found.");
      }
    }
  });
};

export default emoteDiscord;
