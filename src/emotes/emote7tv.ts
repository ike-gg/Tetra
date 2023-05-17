import isValidURL from "../utils/isValidURL";

import { FeedbackManager } from "../utils/managers/FeedbackManager";

import getRawEmote from "./source/getBufferFromUrl";
import emoteOptimise from "./emoteOptimise";

import { ExtractedEmote } from "../types";
import stvGetEmoteById from "./source/7tv/stvGetEmoteById";
const emote7tv = async (
  emoteReference: string,
  feedback?: FeedbackManager
): Promise<ExtractedEmote> => {
  if (!emoteReference) throw new Error("Invalid emote reference.");
  let internalId: string = emoteReference;

  if (isValidURL(internalId)) {
    let fullURL = new URL(emoteReference);
    let pathnamesArray = fullURL.pathname.split("/");
    internalId = pathnamesArray.find((path) => path.length === 24)!;
  }

  if (!internalId || internalId.length !== 24) {
    throw new Error("Invalid emote reference or URL");
  }

  try {
    const emoteInfo = await stvGetEmoteById(internalId);

    const rawEmote = await getRawEmote(emoteInfo.file.url);
    const rawEmoteBuffer = Buffer.from(rawEmote);

    const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
      animated: emoteInfo.animated,
      feedback: feedback,
    });

    return {
      author: emoteInfo.author,
      name: emoteInfo.name,
      data: rawEmoteBuffer,
      finalData: emoteBuffer,
      file: {
        preview: emoteInfo.file.preview,
        url: emoteInfo.file.url,
      },
      animated: emoteInfo.animated,
      origin: "7tv",
      id: emoteReference,
    };
  } catch (error) {
    throw new Error(String(error));
  }
};

export default emote7tv;
