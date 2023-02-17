import isValidURL from "../utils/isValidURL";

import { EmoteResponseAPI } from "../api/7tv/apiResponseType";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

import getEmoteInfo from "../api/7tv/getEmoteInfo";
import getRawEmote from "../api/7tv/getRawEmote";
import emoteOptimise from "./emoteOptimise";

import { ExtractedEmote } from "../types";
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

  if (!internalId) {
    throw new Error("Invalid emote reference or URL");
  }

  if (internalId === undefined || internalId.length !== 24) {
    throw new Error("Invalid emote reference or URL");
  }

  try {
    const emoteInfo = (await getEmoteInfo(internalId)) as EmoteResponseAPI;

    if (emoteInfo.error) throw new Error(`Emote not found. ${emoteInfo.error}`);

    let emotePreview = `https:${emoteInfo.host.url}/2x`;
    emoteInfo.animated ? (emotePreview += ".gif") : (emotePreview += ".webp");

    const rawEmote = await getRawEmote(emoteInfo.host.url, emoteInfo.animated);
    const rawEmoteBuffer = Buffer.from(rawEmote!);

    const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
      animated: emoteInfo.animated,
      feedback: feedback,
    });

    let authorNickname = emoteInfo.owner?.display_name;
    if (!authorNickname) authorNickname = "DeletedUser";

    return {
      author: authorNickname,
      name: emoteInfo.name,
      data: rawEmoteBuffer,
      finalData: emoteBuffer,
      preview: emotePreview,
      animated: emoteInfo.animated,
      origin: "7tv",
      id: emoteReference,
    };
  } catch (error) {
    throw new Error(String(error));
  }
};

export default emote7tv;
