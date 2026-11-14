import { z } from "zod";

import { bttvSearchEmotes } from "./bttv-lookup";
import { type CatalogEmote, catalogEmoteSchema } from "./catalog-emote";
import { ffzSearchEmotes } from "./ffz-lookup";
import { cached, lookupCacheKey } from "./lookup-cache";
import { stvSearchEmotes } from "./stv-lookup";

const CACHE_TTL_SECONDS = 5 * 60;

export const searchProviderSchema = z.enum(["7tv", "bttv", "ffz"]);
export type SearchProvider = z.infer<typeof searchProviderSchema>;

/** Pages are 1-based; past the last one `nextPage` is null. */
export interface EmoteSearchPage {
  items: CatalogEmote[];
  nextPage: number | null;
}

const searchPageSchema = z.object({
  items: z.array(catalogEmoteSchema),
  nextPage: z.number().nullable(),
});

const searchers: Record<
  SearchProvider,
  (query: string, page: number) => Promise<EmoteSearchPage>
> = {
  "7tv": stvSearchEmotes,
  bttv: bttvSearchEmotes,
  ffz: ffzSearchEmotes,
};

/** An empty query lists popular emotes (7TV top, FFZ most used, BTTV globals). */
export const searchEmotes = (
  provider: SearchProvider,
  query: string,
  page: number
): Promise<EmoteSearchPage> =>
  cached(
    lookupCacheKey("emote-search", provider, query, page),
    CACHE_TTL_SECONDS,
    searchPageSchema,
    () => searchers[provider](query, page)
  );
