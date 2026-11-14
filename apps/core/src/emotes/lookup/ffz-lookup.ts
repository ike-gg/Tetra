import { z } from "zod";

import { ffzGetUrlById } from "../source/ffz/helpers/constants";
import type { CatalogEmote } from "./catalog-emote";
import {
  emoteNotFound,
  fetchUpstream,
  readUpstreamJson,
  upstreamError,
} from "./upstream";

const PROVIDER = "FFZ";

const sizesSchema = z.object({
  "1": z.string().optional(),
  "2": z.string().optional(),
  "4": z.string().optional(),
});

const ffzEmoteSchema = z.object({
  id: z.number(),
  name: z.string(),
  // Size of the 1x image
  width: z.number().optional(),
  height: z.number().optional(),
  urls: sizesSchema,
  animated: sizesSchema.nullable().optional(),
});

type FfzEmote = z.infer<typeof ffzEmoteSchema>;

const pick = (sizes: z.infer<typeof sizesSchema>, order: ("1" | "2" | "4")[]) => {
  for (const scale of order) {
    const url = sizes[scale];
    if (url) return { url, scale: Number(scale) };
  }
  return null;
};

/**
 * Animated emotes as WebP: FFZ's `animated/<n>.gif` hangs without a response for 2x and
 * 4x (verified 2026-11), and an extension on a static URL (`/4.png`) is a 400.
 */
const toCatalogEmote = (emote: FfzEmote): CatalogEmote | null => {
  const sizes = emote.animated ?? emote.urls;
  const suffix = emote.animated ? ".webp" : "";
  const file = pick(sizes, ["4", "2", "1"]);
  const preview = pick(sizes, ["2", "1", "4"]);
  if (!file || !preview) return null;

  return {
    id: String(emote.id),
    name: emote.name,
    previewUrl: `${preview.url}${suffix}`,
    url: `${file.url}${suffix}`,
    animated: !!emote.animated,
    source: "ffz",
    width: emote.width ? emote.width * file.scale : undefined,
    height: emote.height ? emote.height * file.scale : undefined,
  };
};

export const ffzResolveEmote = async (id: string) => {
  const response = await fetchUpstream(PROVIDER, ffzGetUrlById(encodeURIComponent(id)));

  if (response.status === 404) throw emoteNotFound();
  if (!response.ok) throw upstreamError(PROVIDER);

  const { emote } = await readUpstreamJson(
    PROVIDER,
    response,
    z.object({ emote: ffzEmoteSchema })
  );

  const result = toCatalogEmote(emote);
  if (!result) throw emoteNotFound();
  return result;
};
