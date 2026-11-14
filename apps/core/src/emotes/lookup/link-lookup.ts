import { MAX_SUPPORTED_SIZE } from "@/constants";
import {
  assertAllowedEmoteSourceUrl,
  safeFetch,
  UrlNotAllowedError,
} from "@/lib/network/url-guard";

import getGiphyGif from "../source/file/get-giphy-gif";
import getImgurFile from "../source/file/get-imgur-file";
import getTenorGif from "../source/file/get-tenor-gif";
import { isDomain } from "../source/parse-emote-link";
import { type CatalogEmote, EmoteLookupError, guessEmoteName } from "./catalog-emote";
import { emoteNotFound, upstreamError } from "./upstream";

import { CoreConsole } from "#/loggers";

const TIMEOUT_MS = 10_000;

// Same set as the bot's link check; the add endpoint validates the file itself again
const IMAGE_TYPE = /^image\/(gif|jpe?g|png|webp|avif)$/;
// Generic or missing types are let through: many hosts don't label images
const GENERIC_TYPES = ["application/octet-stream", "binary/octet-stream"];

const probe = async (url: string, method: "HEAD" | "GET") => {
  try {
    const response = await safeFetch(url, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Only the headers are needed
    if (method === "GET") void response.body?.cancel().catch(() => undefined);
    return response;
  } catch (error) {
    if (error instanceof UrlNotAllowedError) {
      throw new EmoteLookupError("URL_NOT_ALLOWED", error.message);
    }
    CoreConsole.warn("Link probe failed:", error instanceof Error ? error.name : error);
    throw upstreamError("The source");
  }
};

/**
 * A link to an image file. Its host must be on the add endpoint's allow-list, so the
 * panel can pass `url` on unchanged. HEAD first, GET (body discarded) for hosts that
 * don't support HEAD.
 */
export const resolveFileLink = async (
  fileUrl: string,
  name: string
): Promise<CatalogEmote> => {
  try {
    await assertAllowedEmoteSourceUrl(fileUrl);
  } catch (error) {
    if (error instanceof UrlNotAllowedError) {
      throw new EmoteLookupError("URL_NOT_ALLOWED", error.message);
    }
    throw error;
  }

  let response = await probe(fileUrl, "HEAD");
  if (response.status === 405 || response.status === 501) {
    response = await probe(fileUrl, "GET");
  }

  if (response.status >= 400 && response.status < 500) throw emoteNotFound();
  if (!response.ok) throw upstreamError("The source");

  const contentType =
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (
    contentType &&
    !IMAGE_TYPE.test(contentType) &&
    !GENERIC_TYPES.includes(contentType)
  ) {
    throw new EmoteLookupError(
      "UNSUPPORTED_FILE_TYPE",
      "The link doesn't point to a GIF, PNG, WebP, JPEG or AVIF image"
    );
  }

  const size = Number(response.headers.get("content-length"));
  if (size > MAX_SUPPORTED_SIZE) {
    throw new EmoteLookupError("FILE_TOO_LARGE", "The file is larger than 10 MB");
  }

  return {
    id: fileUrl,
    name,
    previewUrl: fileUrl,
    url: fileUrl,
    animated: contentType === "image/gif",
    source: "link",
  };
};

/**
 * Tenor, Giphy and Imgur pages (not their direct files) go through the same helpers as
 * the bot's "File to emote" to find the file. `null` for other links.
 */
export const resolvePageLink = async (url: URL): Promise<CatalogEmote | null> => {
  const hostname = url.hostname.toLowerCase();
  // `/view/cat-dance-gif-123`, `/gifs/cat-dance-AbC123`: the slug without its id
  const slug = new URL(url);
  slug.pathname = slug.pathname.replace(/(-gif)?-[a-zA-Z0-9]+\/?$/, "");
  const name = guessEmoteName(slug);

  let find: ((link: string) => Promise<{ file: { url: string } }>) | null = null;

  if (hostname === "tenor.com" || hostname === "www.tenor.com") find = getTenorGif;
  else if (hostname === "giphy.com" || hostname === "www.giphy.com") find = getGiphyGif;
  else if (isDomain(hostname, ["imgur.com"]) && !hostname.startsWith("i.")) {
    find = getImgurFile;
  }

  if (!find) return null;

  let fileUrl: string;
  try {
    fileUrl = (await find(url.toString())).file.url;
  } catch (error) {
    // The helpers throw plain errors for bad ids and failed API calls alike
    CoreConsole.dev.warn("Page link lookup failed:", error);
    throw emoteNotFound();
  }

  return resolveFileLink(fileUrl, name);
};
