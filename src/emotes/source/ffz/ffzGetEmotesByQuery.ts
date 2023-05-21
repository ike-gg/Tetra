import fetch from "node-fetch";
import { Emote } from "../../../types";
import { BTTVResponseByQuery } from "../../../types/bttv";
import { ffzGetUrlByQuery } from "./helpers/constants";
import { FFZResponseByQuery } from "../../../types/ffz";

const ffzGetEmotesByQuery = async (query: string): Promise<Emote[]> => {
  const response = await fetch(ffzGetUrlByQuery(query));

  if (!response.ok) {
    throw new Error(
      `Request failed, try again in a while. \`BTTV_REQUEST_QUERY_NOT_OK\``
    );
  }

  const data = (await response.json()) as FFZResponseByQuery;

  const transformedEmotes: (Emote | null)[] = data.emoticons.map(
    (emote): Emote | null => {
      const { id, name, owner, urls, animated } = emote;

      const isAnimated = animated ? true : false;

      let urlPreview: string | undefined;
      let urlSource: string | undefined;

      if (animated) {
        if (animated[2]) {
          urlPreview = `${animated[2]}.gif`;
          urlSource = `${animated[2]}.gif`;
        } else if (animated[1]) {
          urlPreview = `${animated[1]}.gif`;
          urlSource = `${animated[1]}.gif`;
        }
      }

      if (!animated) {
        if (urls[2]) {
          urlPreview = urls[2];
          urlSource = urls[2];
        } else if (urls[1]) {
          urlPreview = urls[1];
          urlSource = urls[1];
        }
      }

      if (!urlPreview || !urlSource) {
        return null;
      }

      return {
        animated: isAnimated,
        author: owner.display_name || "DeletedUser",
        file: {
          preview: urlPreview,
          url: urlSource,
        },
        id: String(id),
        name,
        origin: "ffz",
      };
    }
  );

  const emotes = transformedEmotes.filter((emote) => emote !== null) as Emote[];

  return emotes;
};

export default ffzGetEmotesByQuery;
