import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

import { EmbeddedError } from "@/constants/errors";

export class UrlNotAllowedError extends EmbeddedError {
  constructor(reason: string) {
    super({ title: "URL not allowed", description: reason });
    this.name = "UrlNotAllowedError";
  }
}

const privateRanges = new BlockList();

for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  privateRanges.addSubnet(address, prefix, "ipv4");
}

for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  privateRanges.addSubnet(address, prefix, "ipv6");
}

const isPrivateAddress = (address: string) => {
  const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mappedIpv4) return privateRanges.check(mappedIpv4, "ipv4");

  const family = isIP(address);
  if (family === 4) return privateRanges.check(address, "ipv4");
  if (family === 6) return privateRanges.check(address, "ipv6");
  return true;
};

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    throw new UrlNotAllowedError("The URL is invalid.");
  }
};

/** Rejects non-http(s) URLs and hosts that resolve to private, loopback or link-local addresses. */
export const assertPublicUrl = async (url: string) => {
  const { protocol, hostname } = parseUrl(url);

  if (protocol !== "https:" && protocol !== "http:") {
    throw new UrlNotAllowedError("Only http and https URLs are supported.");
  }

  const host = hostname.replace(/^\[|\]$/g, "");

  let addresses: string[];
  try {
    addresses = isIP(host)
      ? [host]
      : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  } catch {
    throw new UrlNotAllowedError("The URL host could not be resolved.");
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UrlNotAllowedError("The URL points to a private network address.");
  }
};

const ALLOWED_EMOTE_HOSTS = [
  "7tv.app",
  "7tv.io",
  "betterttv.net",
  "betterttv.com",
  "frankerfacez.com",
  "jtvnw.net",
  "discordapp.com",
  "discordapp.net",
  "tenor.com",
  "giphy.com",
  "imgur.com",
];

const isAllowedHost = (hostname: string) =>
  ALLOWED_EMOTE_HOSTS.some((root) => hostname === root || hostname.endsWith(`.${root}`));

/** For URLs from the panel: https only and only known emote/CDN hosts. */
export const assertAllowedEmoteSourceUrl = async (url: string) => {
  const { protocol, hostname } = parseUrl(url);

  if (protocol !== "https:") {
    throw new UrlNotAllowedError("Only https URLs are supported.");
  }

  if (!isAllowedHost(hostname.toLowerCase())) {
    throw new UrlNotAllowedError("The URL host is not on the list of supported sources.");
  }

  await assertPublicUrl(url);
};

const MAX_REDIRECTS = 5;

/** `fetch` that re-checks every redirect hop with `assertPublicUrl`. */
export const safeFetch = async (url: string, init?: RequestInit) => {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(currentUrl);

    const response = await fetch(currentUrl, { ...init, redirect: "manual" });
    const location = response.headers.get("location");

    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new UrlNotAllowedError("Too many redirects.");
};
