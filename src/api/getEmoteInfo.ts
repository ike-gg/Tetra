import { EmoteResponseAPI } from "./apiResponseType";

const getURL = (emoteId: string): string => {
  return new URL(emoteId, "https://7tv.io/v3/emotes/").href;
};

const getEmoteInfo = async (emoteId: string): Promise<EmoteResponseAPI> => {
  // const response = await fetch(getURL(emoteId));
  // const data = await response.json() as GetEmoteResponse;
  // return data;

  return await fetch(getURL(emoteId))
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch(console.error);
};

export default getEmoteInfo;
