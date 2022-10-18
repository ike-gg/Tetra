import { EmoteResponseAPI } from "./apiResponseType";

const getURL = (emoteId: string): string => {
  return new URL(emoteId, "https://7tv.io/v3/emotes/").href;
};

const getEmoteInfo = async (emoteId: string): Promise<EmoteResponseAPI> => {
  return await fetch(getURL(emoteId))
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.error(error);
      return undefined;
    });
};

export default getEmoteInfo;
