import { EmoteResponseAPI } from "./apiResponseType";
import fetch from "node-fetch";

const getURL = (emoteId: string): string => {
  return new URL(emoteId, "https://7tv.io/v3/emotes/").href;
};

const getEmoteInfo = async (emoteId: string): Promise<EmoteResponseAPI> => {
  try {
    const request = await fetch(getURL(emoteId));
    const data = await request.json();
    return data as EmoteResponseAPI;
  } catch (error) {
    throw new Error("Emote not found");
  }
};

export default getEmoteInfo;
