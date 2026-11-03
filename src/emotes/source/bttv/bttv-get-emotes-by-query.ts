import fetch from "node-fetch";

import type { Emote } from "../../../types";
import type { BTTVResponseByQuery } from "../../../types/bttv";
import bttvTransformSourceUrl from "./helpers/bttv-transform-source-url";
import { bttvGetUrlByQuery } from "./helpers/constants";

const bttvGetEmotesByQuery = async (query: string): Promise<Emote[]> => {
  const response = await fetch(bttvGetUrlByQuery(query));

  if (!response.ok) {
    throw new Error(
      `Request failed, try again in a while. \`BTTV_REQUEST_QUERY_NOT_OK\``
    );
  }

  const data = (await response.json()) as BTTVResponseByQuery;

  const transformedEmotes: Emote[] = data.map((emote): Emote => {
    const { animated, code, id, user } = emote;

    const urls = bttvTransformSourceUrl(id, animated);

    return {
      animated,
      author: user?.displayName || "DeletedUser",
      file: {
        preview: urls["2x"],
        url: urls["3x"],
      },
      id,
      name: code,
      origin: "bttv",
    };
  });

  return transformedEmotes;
};

export default bttvGetEmotesByQuery;
