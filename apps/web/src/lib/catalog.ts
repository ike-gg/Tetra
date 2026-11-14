import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "@/lib/api";
import { emoteErrorMessage } from "@/lib/emote-mutations";
import { searchFfz } from "@/lib/providers/ffz";
import { ProviderError, type SearchPage } from "@/lib/providers/provider-request";
import { searchSevenTv } from "@/lib/providers/seventv";

const fetchResolved = (url: string) =>
  unwrap(api.emotes.resolve.$get({ query: { url } }));

/** An emote found by link or search (7TV, BTTV, FFZ, Twitch, Discord, an image link). */
export type CatalogEmote = Awaited<ReturnType<typeof fetchResolved>>;

/** A pasted link as one emote (`["emote-resolve", text]`); core caches it for 10 minutes. */
export const resolveEmoteQueryOptions = (text: string) =>
  queryOptions({
    queryKey: ["emote-resolve", text],
    queryFn: () => fetchResolved(text),
    staleTime: 10 * 60 * 1000,
    // A dead link stays dead; an upstream hiccup is retried by pressing Enter
    retry: false,
  });

/** Providers Browse can search; all of them answer the browser directly. */
export type SearchProvider = "7tv" | "ffz";

/** Providers Browse lists. BTTV stays visible while its search is disabled. */
export type BrowseProvider = SearchProvider | "bttv";

export const BROWSE_PROVIDERS: BrowseProvider[] = ["7tv", "ffz", "bttv"];

export const isSearchProvider = (provider: BrowseProvider): provider is SearchProvider =>
  provider !== "bttv";

const fetchSearchPage = (
  provider: SearchProvider,
  query: string,
  page: number,
  signal: AbortSignal
): Promise<SearchPage> =>
  provider === "7tv"
    ? searchSevenTv(query, page, signal)
    : searchFfz(query, page, signal);

/** Pages of a provider's search; an empty query lists popular emotes. */
export const searchEmotesQueryOptions = (provider: SearchProvider, query: string) =>
  infiniteQueryOptions({
    queryKey: ["emote-search", provider, query],
    queryFn: ({ pageParam, signal }) =>
      fetchSearchPage(provider, query, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage ?? undefined,
    staleTime: 5 * 60 * 1000,
    // Retrying a changed API or a rate limit right away only makes it worse
    retry: (failures, error) =>
      failures < 1 && !(error instanceof ProviderError && error.kind !== "unreachable"),
  });

/** Pasted text worth resolving without asking: a link or a Discord emoji mention. */
export const looksLikeEmoteLink = (text: string) =>
  /^https?:\/\/\S+$/i.test(text) || /^<a?:\w{2,32}:\d+>$/.test(text);

const providerErrorMessage = ({ provider, kind }: ProviderError) => {
  switch (kind) {
    case "unreachable":
      return `Couldn't reach ${provider}. Check your connection and try again.`;
    case "rate-limited":
      return `${provider} got too many searches from you. Wait a minute and try again.`;
    case "failed":
      return `${provider} didn't answer properly. Try again in a moment.`;
    case "changed":
      return `${provider} answered in a shape Tetra doesn't know. Its API may have changed.`;
  }
};

/** A sentence for the line under the link field, from the lookup's error code. */
export const lookupErrorMessage = (error: unknown) => {
  if (error instanceof ProviderError) return providerErrorMessage(error);
  if (!(error instanceof ApiError)) return emoteErrorMessage(error);
  switch (error.reference) {
    case "UNSUPPORTED_LINK":
      return "That link isn't an emote Tetra can read.";
    case "URL_NOT_ALLOWED":
      return "Tetra can't download images from that site. Try a 7TV, BTTV or FFZ link, or a direct image link.";
    case "EMOTE_NOT_FOUND":
      return "That emote doesn't exist anymore, or the link is wrong.";
    case "UNSUPPORTED_FILE_TYPE":
      return "That file isn't a GIF, PNG, WebP or JPEG image.";
    case "FILE_TOO_LARGE":
      return "That file is over 10 MB, too big for Tetra to fetch.";
    case "UPSTREAM_ERROR":
      return "The emote site didn't answer. Press Enter to try again.";
    case "PROVIDER_UNAVAILABLE":
      return "That emote site isn't available through Tetra right now.";
    case "INVALID_REQUEST_SCHEMA":
      return "That doesn't look like a link.";
  }
  return emoteErrorMessage(error);
};
