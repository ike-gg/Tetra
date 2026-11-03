import fetch from "node-fetch";

import { EmbeddedError } from "../../../constants/errors";
import { Messages } from "../../../constants/messages";
import type { Emote } from "../../../types";
import type { STVResponseGQL } from "../../../types/7tv";
import sleep from "../../../utils/sleep";
import { stvGetGraphqlUrl } from "./helpers/constants";
import stvGetGraphqlRequestOptions from "./helpers/stv-get-graphql-request-options";
import stvTransformSourceUrl from "./helpers/stv-transform-source-url";

const MAX_TRIES = 3;

const stvGetEmotesByQuery = async (query: string): Promise<Emote[]> => {
  let data: STVResponseGQL;
  let tries = 0;

  do {
    const response = await fetch(stvGetGraphqlUrl, stvGetGraphqlRequestOptions(query));

    data = await response.json();

    if (data.errors?.at(0)?.message.includes("70429")) {
      throw new EmbeddedError(Messages.EMOTE_NOT_FOUND);
    }

    if (data.errors) {
      tries++;
      if (tries < MAX_TRIES) await sleep(1000);
    }
  } while (data.errors && tries < MAX_TRIES);

  if (data.errors) {
    throw new EmbeddedError({
      title: "7TV is unavailable",
      description:
        "7TV search is not responding right now. Try again later or use another source (BTTV, FFZ).",
    });
  }

  const emotes: Emote[] = data.data.emotes.items.map((emote) => {
    const { animated, host, id, name, owner } = emote;

    const urls = stvTransformSourceUrl(host.url, animated);

    return {
      animated,
      author: owner?.display_name || "DeletedUser",
      file: {
        preview: urls["2x"],
        url: urls["3x"],
      },
      id,
      name,
      origin: "7tv",
    };
  });

  return emotes;
};

export default stvGetEmotesByQuery;
