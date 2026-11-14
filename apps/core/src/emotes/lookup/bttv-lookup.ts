import { z } from "zod";

import { bttvCdn } from "../source/bttv/helpers/constants";
import { type CatalogEmote, EmoteLookupError } from "./catalog-emote";
import {
  emoteNotFound,
  fetchUpstream,
  headUpstream,
  readUpstreamJson,
  upstreamError,
} from "./upstream";

const PROVIDER = "BTTV";

/**
 * BTTV's emote endpoints (`/3/emotes/{id}`, `/3/emotes/shared/*`) answer 403 without
 * auth, so a link is resolved from the CDN alone: `/3x` without an extension serves the
 * original file, its type tells whether it's animated. The name isn't available.
 */
export const bttvResolveEmote = async (
  id: string,
  name: string
): Promise<CatalogEmote> => {
  const base = `${bttvCdn}/${id}`;
  const original = await headUpstream(PROVIDER, `${base}/3x`);

  if (original.status === 404) throw emoteNotFound();
  if (original.status !== 200) throw upstreamError(PROVIDER);

  let animated = original.contentType === "image/gif";

  // WebP uploads can be animated or not; animated ones also have a GIF rendition
  if (original.contentType === "image/webp") {
    const gif = await headUpstream(PROVIDER, `${base}/3x.gif`);
    animated = gif.status === 200;
  }

  return {
    id,
    name,
    previewUrl: `${base}/2x.webp`,
    url: `${base}/3x.${animated ? "gif" : "png"}`,
    animated,
    source: "bttv",
  };
};

const globalEmotesSchema = z.array(
  z.object({ id: z.string(), code: z.string(), animated: z.boolean() })
);

/** Only BTTV's global emotes are public: an empty query lists them, a search can't run. */
export const bttvSearchEmotes = async (query: string, page: number) => {
  if (query) {
    throw new EmoteLookupError(
      "PROVIDER_UNAVAILABLE",
      "BTTV search requires an account; paste a BTTV link instead"
    );
  }
  if (page > 1) return { items: [], nextPage: null };

  const response = await fetchUpstream(
    PROVIDER,
    "https://api.betterttv.net/3/cached/emotes/global"
  );
  if (!response.ok) throw upstreamError(PROVIDER);

  const emotes = await readUpstreamJson(PROVIDER, response, globalEmotesSchema);

  const items: CatalogEmote[] = emotes.map(({ id, code, animated }) => ({
    id,
    name: code,
    previewUrl: `${bttvCdn}/${id}/2x.webp`,
    url: `${bttvCdn}/${id}/3x.${animated ? "gif" : "png"}`,
    animated,
    source: "bttv",
  }));

  return { items, nextPage: null };
};
