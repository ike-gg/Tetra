import { z } from "zod";

import { fetchUpstream, readUpstreamJson, upstreamError } from "@/emotes/lookup/upstream";
import { stvGetUrlByChannel } from "@/emotes/source/7tv/helpers/constants";

const PROVIDER = "7TV";

const stvTwitchConnectionSchema = z.object({
  id: z.string(),
  username: z.string(),
  display_name: z.string(),
  emote_set_id: z.string().nullish(),
  emote_set: z.object({ id: z.string() }).nullish(),
  user: z.object({ id: z.string() }),
});

export interface StvChannel {
  twitchId: string;
  twitchLogin: string;
  twitchDisplayName: string;
  stvUserId: string;
  /** The active emote set; null when the user has none. */
  emoteSetId: string | null;
}

/**
 * The 7TV account linked to a Twitch channel, with its active set. Null when the channel
 * has no 7TV account; upstream failures throw `EmoteLookupError("UPSTREAM_ERROR")`.
 */
export const getStvChannel = async (twitchId: string): Promise<StvChannel | null> => {
  const response = await fetchUpstream(PROVIDER, stvGetUrlByChannel(twitchId));

  if (response.status === 404) return null;
  if (!response.ok) throw upstreamError(PROVIDER);

  const body = await readUpstreamJson(PROVIDER, response, stvTwitchConnectionSchema);

  return {
    twitchId: body.id,
    twitchLogin: body.username,
    twitchDisplayName: body.display_name,
    stvUserId: body.user.id,
    emoteSetId: body.emote_set_id ?? body.emote_set?.id ?? null,
  };
};
