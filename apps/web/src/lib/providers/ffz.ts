import { z } from "zod";

import type { CatalogEmote } from "@/lib/catalog";
import {
  MAX_PAGE,
  PAGE_SIZE,
  requestProviderJson,
  type SearchPage,
} from "@/lib/providers/provider-request";

const PROVIDER = "FFZ";

const sizesSchema = z.object({
  "1": z.string().optional(),
  "2": z.string().optional(),
  "4": z.string().optional(),
});

type Sizes = z.infer<typeof sizesSchema>;

const emoteSchema = z.object({
  id: z.number(),
  name: z.string(),
  // Size of the 1x image
  width: z.number().optional(),
  height: z.number().optional(),
  urls: sizesSchema,
  animated: sizesSchema.nullable().optional(),
});

type FfzEmote = z.infer<typeof emoteSchema>;

const responseSchema = z.object({
  _pages: z.number(),
  emoticons: z.array(emoteSchema),
});

const pick = (sizes: Sizes, order: (keyof Sizes)[]) => {
  for (const scale of order) {
    const url = sizes[scale];
    if (url) return { url, scale: Number(scale) };
  }
  return null;
};

// Same as core's ffz-lookup: animated emotes as WebP, because FFZ's `animated/<n>.gif`
// hangs without a response for 2x and 4x, and an extension on a static URL is a 400
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

/** FFZ's emote search from the browser, by usage (`count-desc`): empty = most used. */
export const searchFfz = async (
  query: string,
  page: number,
  signal?: AbortSignal
): Promise<SearchPage> => {
  const params = new URLSearchParams({
    per_page: String(PAGE_SIZE),
    page: String(page),
    sort: "count-desc",
  });
  if (query) params.set("q", query);

  const body = await requestProviderJson(
    PROVIDER,
    `https://api.frankerfacez.com/v1/emotes?${params}`,
    responseSchema,
    { signal }
  );

  const items = body.emoticons
    .map(toCatalogEmote)
    .filter((emote): emote is CatalogEmote => emote !== null);
  const hasMore = page < MAX_PAGE && page < body._pages;
  return { items, nextPage: hasMore ? page + 1 : null };
};
