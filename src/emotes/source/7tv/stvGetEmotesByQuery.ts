import fetch from "node-fetch";
import { stvGetGraphqlUrl } from "./helpers/constants";
import { Emote } from "../../../types";
import { STVResponseGQL } from "../../../types/7tv";
import sleep from "../../../utils/sleep";
import stvGetGraphqlRequestOptions from "./helpers/stvGetGraphqlRequestOptions";
import stvTransformSourceUrl from "./helpers/stvTransformSourceUrl";
import { Messages } from "../../../constants/messages";

const stvGetEmotesByQuery = async (query: string): Promise<Emote[]> => {
  let data: STVResponseGQL;
  let tries = 0;

  do {
    const response = await fetch(
      stvGetGraphqlUrl,
      stvGetGraphqlRequestOptions(query)
    );

    data = await response.json();

    if (data.errors?.at(0)?.message.includes("70429")) {
      throw new Error(Messages.EMOTE_NOT_FOUND.toString());
    }

    if (data.errors) {
      tries++;
      await sleep(1000);
    }
  } while (data.errors || tries > 5);

  if (data.errors) {
    throw new Error(
      `Request failed, try again in a while. \`STV_REQUEST_QUERY_FAILED5\``
    );
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
