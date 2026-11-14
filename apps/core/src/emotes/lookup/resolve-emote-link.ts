import { parseEmoteLink } from "../source/parse-emote-link";
import { bttvResolveEmote } from "./bttv-lookup";
import {
  type CatalogEmote,
  catalogEmoteSchema,
  EmoteLookupError,
  guessEmoteName,
} from "./catalog-emote";
import { discordResolveEmote } from "./discord-lookup";
import { ffzResolveEmote } from "./ffz-lookup";
import { resolveFileLink, resolvePageLink } from "./link-lookup";
import { cached, lookupCacheKey } from "./lookup-cache";
import { stvResolveEmote } from "./stv-lookup";
import { twitchResolveEmote } from "./twitch-lookup";

const CACHE_TTL_SECONDS = 10 * 60;
const FALLBACK_NAME = "emote";

// `<:name:id>` / `<a:name:id>`, as Discord renders a custom emoji in message text
const DISCORD_MENTION = /^<(a)?:([a-zA-Z0-9_]{2,32}):(\d{17,21})>$/;

const unsupportedLink = () =>
  new EmoteLookupError(
    "UNSUPPORTED_LINK",
    "Paste a link to a 7TV, BTTV, FFZ, Twitch or Discord emote, or to an image"
  );

const resolve = async (input: string): Promise<CatalogEmote> => {
  const mention = input.match(DISCORD_MENTION);
  if (mention) {
    const [, animated, name, id] = mention;
    return discordResolveEmote(id, name, !!animated);
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw unsupportedLink();
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw unsupportedLink();

  const link = parseEmoteLink(url);

  if (link) {
    if (!link.id) throw unsupportedLink();

    switch (link.provider) {
      case "7tv":
        return stvResolveEmote(link.id);
      case "ffz":
        return ffzResolveEmote(link.id);
      case "bttv":
        return bttvResolveEmote(link.id, FALLBACK_NAME);
      case "twitch":
        return twitchResolveEmote(link.id, FALLBACK_NAME);
      case "discord":
        return discordResolveEmote(
          link.id,
          url.searchParams.get("name") || FALLBACK_NAME
        );
    }
  }

  return (
    (await resolvePageLink(url)) ?? resolveFileLink(url.toString(), guessEmoteName(url))
  );
};

/** A pasted link or Discord emoji mention as one emote; successes are cached for 10 min. */
export const resolveEmoteLink = (input: string) =>
  cached(
    lookupCacheKey("emote-resolve", input),
    CACHE_TTL_SECONDS,
    catalogEmoteSchema,
    () => resolve(input)
  );
