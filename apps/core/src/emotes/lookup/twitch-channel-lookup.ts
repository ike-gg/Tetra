import { z } from "zod";

import { twitchApi } from "@/utils/managers/twitch-manager";

import { catalogEmoteSchema, EmoteLookupError } from "./catalog-emote";
import { cached, lookupCacheKey } from "./lookup-cache";
import { upstreamError } from "./upstream";

import { CoreConsole } from "#/loggers";

const PROVIDER = "Twitch";
const CDN = "https://static-cdn.jtvnw.net/emoticons/v2";
const HELIX_TIMEOUT_MS = 10_000;

const SEARCH_LIMIT = 10;
const SEARCH_TTL_SECONDS = 5 * 60;
const CHANNEL_TTL_SECONDS = 60 * 60;
const EMOTES_TTL_SECONDS = 10 * 60;

export const twitchChannelSchema = z.object({
  id: z.string(),
  login: z.string(),
  displayName: z.string(),
  avatarUrl: z.string(),
});

export const twitchChannelSearchResultSchema = twitchChannelSchema.extend({
  live: z.boolean(),
});

export const twitchChannelDetailsSchema = twitchChannelSchema.extend({
  /** Only partners and affiliates have subscriber and bit emotes. */
  broadcasterType: z.enum(["partner", "affiliate"]).nullable(),
});

export const twitchChannelEmoteSchema = catalogEmoteSchema.extend({
  source: z.literal("twitch"),
  /** Helix `emote_type`: `subscriptions`, `follower` or `bitstier` (others may appear). */
  type: z.string(),
  /** Subscription tier for `subscriptions` emotes, otherwise null. */
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
});

export type TwitchChannelSearchResult = z.infer<typeof twitchChannelSearchResultSchema>;
export type TwitchChannelDetails = z.infer<typeof twitchChannelDetailsSchema>;
export type TwitchChannelEmote = z.infer<typeof twitchChannelEmoteSchema>;

/**
 * Helix call with a timeout (twurple has none); every failure becomes `UPSTREAM_ERROR`.
 * The error itself isn't logged: twurple puts the request in its message.
 */
const helix = async <T>(what: string, run: () => Promise<T>): Promise<T> => {
  let timer: Timer | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), HELIX_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    CoreConsole.warn(
      `Helix ${what} failed:`,
      error instanceof Error ? error.name : "unknown error"
    );
    throw upstreamError(PROVIDER);
  } finally {
    clearTimeout(timer);
  }
};

/** Channel search for autocomplete; an exact login match goes first. */
export const searchTwitchChannels = (query: string) =>
  cached(
    lookupCacheKey("twitch-channel-search", query.toLowerCase()),
    SEARCH_TTL_SECONDS,
    z.array(twitchChannelSearchResultSchema),
    async () => {
      const result = await helix("channel search", () =>
        twitchApi.search.searchChannels(query, { limit: SEARCH_LIMIT })
      );
      const channels = result.data.map((channel) => ({
        id: channel.id,
        login: channel.name,
        displayName: channel.displayName,
        avatarUrl: channel.thumbnailUrl,
        live: channel.isLive,
      }));
      const login = query.toLowerCase();
      return [
        ...channels.filter((channel) => channel.login === login),
        ...channels.filter((channel) => channel.login !== login),
      ];
    }
  );

export const channelNotFound = () =>
  new EmoteLookupError("CHANNEL_NOT_FOUND", "There is no Twitch channel with that name");

/** One channel by login (case-insensitive); unknown logins throw `CHANNEL_NOT_FOUND`. */
export const getTwitchChannel = (login: string) =>
  cached(
    lookupCacheKey("twitch-channel", login.toLowerCase()),
    CHANNEL_TTL_SECONDS,
    twitchChannelDetailsSchema,
    async () => {
      const user = await helix("user lookup", () =>
        twitchApi.users.getUserByName(login.toLowerCase())
      );
      if (!user) throw channelNotFound();
      return {
        id: user.id,
        login: user.name,
        displayName: user.displayName,
        avatarUrl: user.profilePictureUrl,
        broadcasterType: user.broadcasterType || null,
      };
    }
  );

const TIERS = { "1000": 1, "2000": 2, "3000": 3 } as const;
const TYPE_ORDER = ["follower", "subscriptions", "bitstier"];
const typeRank = (type: string) => {
  const index = TYPE_ORDER.indexOf(type);
  return index === -1 ? TYPE_ORDER.length : index;
};

/**
 * A channel's own Twitch emotes (follower, subscriber, bits), grouped by type and tier.
 * Files come from `default`, which serves the GIF when the emote is animated (same as
 * the link lookup), so `url` is the animated file whenever there is one. An unknown id
 * gives an empty list (Helix answers that way).
 */
export const getTwitchChannelEmotes = (channelId: string) =>
  cached(
    lookupCacheKey("twitch-channel-emotes", channelId),
    EMOTES_TTL_SECONDS,
    z.array(twitchChannelEmoteSchema),
    async () => {
      const emotes = await helix("channel emotes", () =>
        twitchApi.chat.getChannelEmotes(channelId)
      );
      return emotes
        .map(
          (emote): TwitchChannelEmote => ({
            id: emote.id,
            name: emote.name,
            previewUrl: `${CDN}/${emote.id}/default/dark/2.0`,
            url: `${CDN}/${emote.id}/default/dark/3.0`,
            animated: emote.formats.includes("animated"),
            source: "twitch",
            type: emote.type,
            tier: emote.tier ? (TIERS[emote.tier] ?? null) : null,
          })
        )
        .sort(
          (a, b) => typeRank(a.type) - typeRank(b.type) || (a.tier ?? 0) - (b.tier ?? 0)
        );
    }
  );
