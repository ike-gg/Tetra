import { z } from "zod";

import { fetchUpstream, readUpstreamJson, upstreamError } from "@/emotes/lookup/upstream";
import {
  stvGetGraphqlUrl,
  stvGetUrlByChannel,
} from "@/emotes/source/7tv/helpers/constants";

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

const USERNAME_TTL = 60 * 60 * 1000;
const usernameCache = new Map<string, { at: number; value: Promise<string | null> }>();

const stvUserByIdSchema = z.object({
  data: z.object({ user: z.object({ id: z.string(), username: z.string() }).nullish() }),
});

/** 7TV answers unknown ids with this placeholder instead of null. */
const DELETED_USER_ID = "00000000000000000000000000";

/**
 * A 7TV user's username by id (GraphQL, a few hundred bytes; REST `/v3/users/<id>` sends
 * every emote set, over 1 MB). Null when unknown or 7TV fails; cached for an hour.
 */
export const getStvUsername = (stvUserId: string): Promise<string | null> => {
  const now = Date.now();
  const hit = usernameCache.get(stvUserId);
  if (hit && now - hit.at < USERNAME_TTL) return hit.value;
  if (usernameCache.size > 1000) usernameCache.clear();

  const value = (async () => {
    try {
      const response = await fetchUpstream(PROVIDER, stvGetGraphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "query($id: ObjectID!) { user(id: $id) { id username } }",
          variables: { id: stvUserId },
        }),
      });
      if (!response.ok) throw upstreamError(PROVIDER);
      const body = await readUpstreamJson(PROVIDER, response, stvUserByIdSchema);
      const user = body.data.user;
      return user && user.id !== DELETED_USER_ID ? user.username : null;
    } catch {
      // Not cached, the next emote asks again
      usernameCache.delete(stvUserId);
      return null;
    }
  })();
  usernameCache.set(stvUserId, { at: now, value });
  return value;
};
