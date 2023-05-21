import fetch from "node-fetch";
import { endpoints, authHeaders } from "./base";
import type { ErrorResponse } from "./base";
import { Emote } from "../../../types";

interface EmoteResponse {
  data: {
    id: string;
    name: string;
    images: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    format: ["static"?, "animated"?];
  }[];
}

const getEmotes = async (
  channelId: string
): Promise<ErrorResponse | Emote[]> => {
  const request = await fetch(endpoints.fetchEmotes(channelId), {
    headers: authHeaders,
  });
  const response = (await request.json()) as EmoteResponse | ErrorResponse;

  if ("error" in response) return response;
  if (response.data.length === 0) return [];

  const emotes: Emote[] = response.data.map((emote): Emote => {
    const isAnimated = emote.format.includes("animated");
    let hostUrl = emote.images.url_4x;

    if (isAnimated) {
      const newUrl = new URL(hostUrl);
      const newPath = newUrl.pathname.replace("static", "animated");
      hostUrl = new URL(newPath, newUrl.origin).href;
    }

    return {
      author: ".",
      id: emote.id,
      name: emote.name,
      animated: isAnimated,
      origin: "twitch",
      file: {
        url: hostUrl,
        preview: emote.images.url_2x,
      },
    };
  });

  return emotes;
};

export default getEmotes;
