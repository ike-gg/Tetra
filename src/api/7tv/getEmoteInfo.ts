import { EmoteResponseAPI } from "./apiResponseType";
import fetch from "node-fetch";

const getURL = (emoteId: string): string => {
  return new URL(emoteId, "https://7tv.io/v3/emotes/").href;
};

const getEmoteInfo = async (emoteId: string): Promise<EmoteResponseAPI> => {
  return await fetch(getURL(emoteId))
    .then((response) => response.json())
    .then((data) => {
      return data as EmoteResponseAPI;
    })
    .catch((error) => {
      console.error(error);
      throw new Error("Emote not found");
    });
};

export default getEmoteInfo;
