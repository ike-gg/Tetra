import fetch from "node-fetch";
import { stvGetUrlByChannel } from "./helpers/constants";
import { STVSetEmotes } from "../../../types/7tv";
import { Emote } from "../../../types";
import stvTransformSourceUrl from "./helpers/stvTransformSourceUrl";

const stvGetEmotesFromChannel = async (channelId: string): Promise<Emote[]> => {
  const response = await fetch(stvGetUrlByChannel(channelId));

  if (response.status === 404)
    throw new Error("Channel not found in 7TV. `STV_REQUEST_CHANNEL_404`");

  if (!response.ok) {
    throw new Error("Request failed, try again in a while. `STV_REQUEST_CHANNEL_NOT_OK`");
  }

  const data = (await response.json()) as STVSetEmotes;

  const emotes = data.emote_set.emotes;

  const transformedEmotes: Emote[] = emotes.map(({ data: emote }) => {
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

  return transformedEmotes;
};

export default stvGetEmotesFromChannel;
