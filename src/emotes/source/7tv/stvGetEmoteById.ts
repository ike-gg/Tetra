import fetch from "node-fetch";
import { stvGetUrlById } from "./helpers/constants";
import { Emote } from "../../../types";
import { STVEmote } from "../../../types/7tv";
import stvTransformSourceUrl from "./helpers/stvTransformSourceUrl";
import { env, isDevelopment } from "../../../env";

const stvGetEmoteById = async (emoteId: string): Promise<Emote> => {
  const response = await fetch(stvGetUrlById(emoteId));

  if (!response.ok) {
    throw new Error(`Request failed, try again in a while. \`STV_REQUEST_ID_NOT_OK\``);
  }

  const data = (await response.json()) as STVEmote;

  if (data.id === "000000000000000000000000") {
    throw new Error("Emote might have been deleted. `STV_EMOTE_ID_ZERO`");
  }

  const { animated, host, id, name, owner } = data;

  const urls = stvTransformSourceUrl(host.url, animated);

  const emote: Emote = {
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

  return emote;
};

export default stvGetEmoteById;
