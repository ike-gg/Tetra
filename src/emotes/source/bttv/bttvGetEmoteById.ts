import { Emote } from "../../../types";
import { BTTVResponseById } from "../../../types/bttv";
import bttvTransformSourceUrl from "./helpers/bttvTransformSourceUrl";
import { bttvGetUrlById } from "./helpers/constants";
import fetch from "node-fetch";

const bttvGetEmoteById = async (emoteId: string): Promise<Emote> => {
  const response = await fetch(bttvGetUrlById(emoteId));

  if (response.status === 404) {
    throw new Error("Emote might have been deleted. `BTTV_REQUEST_ID_404`");
  }

  if (!response.ok) {
    throw new Error(
      `Request failed, try again in a while. \`BTTV_REQUEST_ID_NOT_OK\``
    );
  }

  const data = (await response.json()) as BTTVResponseById;

  const { animated, code, id, user } = data;

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
};

export default bttvGetEmoteById;
