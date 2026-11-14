export type EmoteLinkProvider = "7tv" | "bttv" | "ffz" | "discord" | "twitch";

/**
 * A link on a known emote host. `id` is null when the host is known but the link holds
 * no emote id (e.g. a 7TV user page).
 */
export interface ParsedEmoteLink {
  provider: EmoteLinkProvider;
  id: string | null;
}

/** Matches `cdn.7tv.app` for `7tv.app`, but not `my7tvfan.com`. */
export const isDomain = (hostname: string, roots: string[]) =>
  roots.some((root) => hostname === root || hostname.endsWith(`.${root}`));

const DISCORD_HOSTS = ["cdn.discordapp.com", "media.discordapp.net"];

// `/emotes/<id>` on the site and API, `/emote/<id>/4x.webp` on the CDN. Old ids are 24 hex
// chars, new ones 26-char ULIDs. Other pages (users, emote sets) carry ids too.
const parse7tvId = (pathname: string) =>
  pathname.match(/\/emotes?\/([a-zA-Z0-9]{24,30})(?:[^\w]|$)/)?.[1] ?? null;

// `/emoticon/12345-Name`, `cdn.frankerfacez.com/emote/12345/4`: the id is the largest number
const parseFfzId = (pathname: string) => {
  const id = pathname
    .split("/")
    .map((segment) => parseInt(segment, 10))
    .filter((num) => !Number.isNaN(num))
    .sort((a, b) => b - a)[0];
  return id ? String(id) : null;
};

const parseBttvId = (pathname: string) =>
  pathname.split("/").find((segment) => /^[0-9a-f]{24}$/i.test(segment)) ?? null;

/**
 * Finds the provider and emote id of a link to 7TV, BTTV, FFZ, a Discord emoji or a
 * Twitch emote. `null` for every other link (e.g. a Discord attachment or a plain image),
 * which is then handled as a direct file link.
 */
export const parseEmoteLink = (url: URL): ParsedEmoteLink | null => {
  const hostname = url.hostname.toLowerCase();
  const { pathname } = url;

  if (isDomain(hostname, ["7tv.app", "7tv.io"])) {
    return { provider: "7tv", id: parse7tvId(pathname) };
  }

  if (isDomain(hostname, ["frankerfacez.com"])) {
    return { provider: "ffz", id: parseFfzId(pathname) };
  }

  if (isDomain(hostname, ["betterttv.com", "betterttv.net"])) {
    return { provider: "bttv", id: parseBttvId(pathname) };
  }

  if (DISCORD_HOSTS.includes(hostname) && pathname.startsWith("/emojis/")) {
    return {
      provider: "discord",
      id: pathname.match(/^\/emojis\/(\d{17,21})/)?.[1] ?? null,
    };
  }

  if (hostname === "static-cdn.jtvnw.net" && pathname.startsWith("/emoticons/")) {
    const id = pathname.match(
      /^\/emoticons\/v[12]\/(\d+|emotesv2_[0-9a-f]{32})(?:\/|$)/i
    );
    return { provider: "twitch", id: id?.[1] ?? null };
  }

  return null;
};
