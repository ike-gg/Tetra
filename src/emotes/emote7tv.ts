import isValidURL from "../utils/isValidURL";

import { EmoteResponseAPI } from "../api/7tv/apiResponseType";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

import getEmoteInfo from "../api/7tv/getEmoteInfo";
import getRawEmote from "../api/7tv/getRawEmote";
import emoteOptimise from "./emoteOptimise";

import { ExtractedEmote } from "../types";
const emote7tv = async (emoteReference: string, feedback?: FeedbackManager) => {
  return new Promise<ExtractedEmote>(async (resolve, reject) => {
    if (!emoteReference) throw new Error("Invalid emote reference.");
    let internalId: string = emoteReference;

    if (isValidURL(internalId)) {
      let fullURL = new URL(emoteReference);
      let pathnamesArray = fullURL.pathname.split("/");
      internalId = pathnamesArray.find((path) => path.length === 24)!;
    }

    if (!internalId) return;

    if (internalId === undefined || internalId.length !== 24) {
      reject("Invalid emote reference or URL");
      return;
    }

    try {
      const emoteInfo = (await getEmoteInfo(internalId)) as EmoteResponseAPI;

      let emotePreview = `https:${emoteInfo.host.url}/2x`;
      emoteInfo.animated ? (emotePreview += ".gif") : (emotePreview += ".webp");

      const rawEmote = await getRawEmote(
        emoteInfo.host.url,
        emoteInfo.animated
      );
      const rawEmoteBuffer = Buffer.from(rawEmote!);

      const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
        animated: emoteInfo.animated,
        feedback: feedback,
      });

      resolve({
        author: emoteInfo.owner.display_name,
        name: emoteInfo.name,
        image: emoteBuffer,
        preview: emotePreview,
      });
    } catch (error) {
      reject("Emote not found.");
    }
  });
};

export default emote7tv;
