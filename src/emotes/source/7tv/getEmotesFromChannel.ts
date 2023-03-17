import fetch from "node-fetch";

import { EmoteGQL, EmoteResponseAPI } from "./apiResponseType";

interface SetEmotes7TV {
  id: string;
  username: string;
  emote_set: {
    id: string;
    name: string;
    emotes: {
      id: string;
      data: EmoteResponseAPI;
    }[];
  };
  emote_count: number;
  status_code?: number;
}

const getEmotesFromChannel = async (channelId: string): Promise<EmoteGQL[]> => {
  try {
    const response = await fetch(`https://7tv.io/v3/users/twitch/${channelId}`);
    const data = (await response.json()) as SetEmotes7TV;

    if (data.status_code === 404)
      throw new Error(
        "Channel exists on twitch, but not registered in 7tv, check for typo."
      );

    const emotes = data.emote_set.emotes;

    const transformedEmotes: EmoteGQL[] = emotes.map(({ data: emote }) => {
      const { animated, host, id, name, owner } = emote;

      let previewUrl = `${emote.host.url.replace("//", "https://")}/2x.`;
      let url = `${emote.host.url.replace("//", "https://")}/4x.`;

      emote.animated ? (url += "gif") : (url += "webp");
      emote.animated ? (previewUrl += "gif") : (previewUrl += "webp");

      return {
        animated,
        host: {
          preview: previewUrl,
          url,
        },
        id,
        name,
        origin: "7tv",
        owner,
      };
    });

    return transformedEmotes;
  } catch (error) {
    throw new Error(String(error));
  }
};

export default getEmotesFromChannel;
