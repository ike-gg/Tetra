import { z } from "zod";

import type { CatalogEmote } from "@/lib/catalog";
import { requestProviderJson } from "@/lib/providers/provider-request";

const PROVIDER = "BTTV";
const CDN = "https://cdn.betterttv.net/emote";

const emoteSchema = z.object({
  id: z.string(),
  code: z.string(),
  animated: z.boolean(),
});

const userSchema = z.object({
  channelEmotes: z.array(emoteSchema),
  sharedEmotes: z.array(emoteSchema),
});

// Same files as core's bttv-lookup: 3x is the largest, GIF for animations, PNG for stills
const toCatalogEmote = ({ id, code, animated }: z.infer<typeof emoteSchema>) =>
  ({
    id,
    name: code,
    previewUrl: `${CDN}/${id}/2x.webp`,
    url: `${CDN}/${id}/3x.${animated ? "gif" : "png"}`,
    animated,
    source: "bttv",
  }) satisfies CatalogEmote;

/**
 * A Twitch channel's BTTV emotes, its own and the shared ones it uses; 404 when the
 * channel has no BTTV account. No custom headers: BTTV's preflight answers 403.
 */
export const getBttvChannelEmotes = async (
  twitchId: string,
  signal?: AbortSignal
): Promise<CatalogEmote[]> => {
  const body = await requestProviderJson(
    PROVIDER,
    `https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(twitchId)}`,
    userSchema,
    { signal }
  );
  return [...body.channelEmotes, ...body.sharedEmotes].map(toCatalogEmote);
};
