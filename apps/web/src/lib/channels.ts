import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "@/lib/api";
import { fromCatalogEmote, type PanelEmote } from "@/lib/emote";
import { emoteErrorMessage } from "@/lib/emote-mutations";
import { getBttvChannelEmotes } from "@/lib/providers/bttv";
import { getFfzChannelEmotes } from "@/lib/providers/ffz";
import { ProviderError } from "@/lib/providers/provider-request";
import { getSevenTvChannelEmotes } from "@/lib/providers/seventv";

/** Twitch logins, as core's `twitchLoginSchema` checks them. */
export const TWITCH_LOGIN = /^[a-zA-Z0-9_]{1,25}$/;

/**
 * A login from what someone typed or pasted: `xqc`, `@xqc` or a `twitch.tv/xqc` link.
 * Null when it can't be one.
 */
export const parseTwitchLogin = (text: string) => {
  const trimmed = text.trim();
  const link = trimmed.match(/^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/(\w+)/i);
  const login = (link?.[1] ?? trimmed).replace(/^@/, "");
  return TWITCH_LOGIN.test(login) ? login.toLowerCase() : null;
};

const fetchChannelSearch = (query: string) =>
  unwrap(api.twitch.channels.$get({ query: { query } }));

export type TwitchChannelResult = Awaited<
  ReturnType<typeof fetchChannelSearch>
>["channels"][number];

/** Channel autocomplete (`["twitch-channels", query]`); keeps the last list while typing. */
export const channelSearchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["twitch-channels", query],
    queryFn: () => fetchChannelSearch(query),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

const fetchChannel = (login: string) =>
  unwrap(api.twitch.channels[":login"].$get({ param: { login } }));

export type TwitchChannel = Awaited<ReturnType<typeof fetchChannel>>;

/** One channel by login (`["twitch-channel", login]`); 404 `CHANNEL_NOT_FOUND`. */
export const channelQueryOptions = (login: string) =>
  queryOptions({
    queryKey: ["twitch-channel", login],
    queryFn: () => fetchChannel(login),
    staleTime: 10 * 60 * 1000,
  });

export const isChannelNotFound = (error: unknown) =>
  error instanceof ApiError && error.reference === "CHANNEL_NOT_FOUND";

const fetchTwitchEmotes = (channelId: string) =>
  unwrap(api.twitch.channels[":channelId"].emotes.$get({ param: { channelId } }));

export type TwitchChannelEmote = Awaited<
  ReturnType<typeof fetchTwitchEmotes>
>["emotes"][number];

/** Tabs on the channel page, in this order. */
export const CHANNEL_PROVIDERS = ["twitch", "7tv", "bttv", "ffz"] as const;

export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number];

export const CHANNEL_PROVIDER_NAMES: Record<ChannelProvider, string> = {
  twitch: "Twitch",
  "7tv": "7TV",
  bttv: "BTTV",
  ffz: "FFZ",
};

/** A Twitch emote keeps its type and tier, so the Twitch tab can group by them. */
export type ChannelEmote = PanelEmote & { group?: string };

const TWITCH_GROUPS: Record<string, string> = {
  follower: "follower",
  bitstier: "bits",
};

const twitchGroup = ({ type, tier }: TwitchChannelEmote) =>
  type === "subscriptions"
    ? tier
      ? `tier ${tier}`
      : "subscriber"
    : (TWITCH_GROUPS[type] ?? type);

// The same emote can sit in a set twice under two aliases; a list needs unique keys
const unique = (emotes: ChannelEmote[]) => {
  const seen = new Set<string>();
  return emotes.filter(({ key }) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchChannelEmotes = async (
  provider: ChannelProvider,
  channelId: string,
  signal: AbortSignal
): Promise<ChannelEmote[]> => {
  if (provider === "twitch") {
    const { emotes } = await fetchTwitchEmotes(channelId);
    return unique(
      emotes.map((emote) => ({ ...fromCatalogEmote(emote), group: twitchGroup(emote) }))
    );
  }
  const load =
    provider === "7tv"
      ? getSevenTvChannelEmotes
      : provider === "bttv"
        ? getBttvChannelEmotes
        : getFfzChannelEmotes;
  try {
    return unique((await load(channelId, signal)).map(fromCatalogEmote));
  } catch (error) {
    // No account on that site is the same as no emotes there
    if (error instanceof ProviderError && error.kind === "not-found") return [];
    throw error;
  }
};

/** A channel's emotes on one site (`["channel-emotes", provider, channelId]`). */
export const channelEmotesQueryOptions = (
  provider: ChannelProvider,
  channelId: string,
  enabled = true
) =>
  queryOptions({
    queryKey: ["channel-emotes", provider, channelId],
    queryFn: ({ signal }) => fetchChannelEmotes(provider, channelId, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    // Retrying a changed API or a rate limit right away only makes it worse
    retry: (failures, error) =>
      failures < 1 &&
      !(error instanceof ProviderError && error.kind !== "unreachable") &&
      !(error instanceof ApiError && error.status < 500),
  });

/** A sentence for a failed Twitch call (channel lookup or its emotes). */
export const twitchErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    switch (error.reference) {
      case "UPSTREAM_ERROR":
        return "Twitch didn't answer. try again in a moment";
      case "RATE_LIMITED":
        return "that was a lot of requests in a minute. wait a moment and try again";
    }
  }
  return emoteErrorMessage(error);
};
