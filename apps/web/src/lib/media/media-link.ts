import { formatBytes } from "@/lib/format-bytes";
import { lookupFfzEmote } from "@/lib/providers/ffz";
import { ProviderError } from "@/lib/providers/provider-request";
import { lookupSevenTvEmote } from "@/lib/providers/seventv";

export type MediaLinkErrorKind =
  | "invalid"
  | "page"
  | "not-found"
  | "unreadable"
  | "type"
  | "too-big"
  | "failed";

/** A link the editor can't open; `message` is the line shown under the field. */
export class MediaLinkError extends Error {
  constructor(
    public readonly kind: MediaLinkErrorKind,
    message: string
  ) {
    super(message);
    this.name = "MediaLinkError";
  }
}

/** The text as an http(s) URL, or null. */
export const parseMediaLink = (text: string) => {
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.hostname ? url : null;
  } catch {
    return null;
  }
};

const isDomain = (hostname: string, roots: string[]) =>
  roots.some((root) => hostname === root || hostname.endsWith(`.${root}`));

// Same id rules as core's parse-emote-link: 24 hex or 26-char ULIDs on 7TV, the largest
// number on FFZ, 24 hex on BTTV
const sevenTvId = (path: string) =>
  path.match(/\/emotes?\/([a-zA-Z0-9]{24,30})(?:[^\w]|$)/)?.[1] ?? null;

const ffzId = (path: string) => {
  const id = path
    .split("/")
    .map((segment) => Number.parseInt(segment, 10))
    .filter((number) => !Number.isNaN(number))
    .sort((a, b) => b - a)[0];
  return id ? String(id) : null;
};

const bttvId = (path: string) =>
  path.split("/").find((segment) => /^[0-9a-f]{24}$/i.test(segment)) ?? null;

type Target = { url: string; name: string; source: string };

const notAnEmote = (provider: string) =>
  new MediaLinkError(
    "page",
    `that ${provider} link isn't an emote. open the emote's page and copy its link`
  );

const providerFailure = (error: unknown) => {
  if (!(error instanceof ProviderError)) return error;
  switch (error.kind) {
    case "not-found":
      return new MediaLinkError(
        "not-found",
        `that emote isn't on ${error.provider} anymore, or the link is wrong`
      );
    case "unreachable":
      return new MediaLinkError(
        "failed",
        `i couldn't reach ${error.provider}. check your connection and try again`
      );
    default:
      return new MediaLinkError(
        "failed",
        `${error.provider} didn't answer properly. try again in a moment`
      );
  }
};

const lastSegmentName = (url: URL) => {
  const segment = decodeURIComponent(
    url.pathname.split("/").filter(Boolean).at(-1) ?? ""
  );
  return segment.replace(/\.[^.]+$/, "") || url.hostname;
};

/**
 * Where the file behind a link is. 7TV and FFZ pages (and their CDN links) are looked up
 * through the providers' public APIs, which answer the browser directly, so the editor
 * gets the same full-size file Quick add would; BTTV maps to its CDN file. Anything else
 * is taken as a direct file link. No account needed, so /editor works the same.
 */
const resolveTarget = async (url: URL, signal?: AbortSignal): Promise<Target> => {
  const host = url.hostname.toLowerCase();
  try {
    if (isDomain(host, ["7tv.app", "7tv.io"])) {
      const id = sevenTvId(url.pathname);
      if (!id) throw notAnEmote("7TV");
      const emote = await lookupSevenTvEmote(id, signal);
      return { url: emote.url, name: emote.name, source: "7TV" };
    }
    if (isDomain(host, ["frankerfacez.com"])) {
      const id = ffzId(url.pathname);
      if (!id) throw notAnEmote("FFZ");
      const emote = await lookupFfzEmote(id, signal);
      if (!emote) throw new MediaLinkError("type", "that FFZ emote has no image to open");
      return { url: emote.url, name: emote.name, source: "FFZ" };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw providerFailure(error);
  }
  if (isDomain(host, ["betterttv.com", "betterttv.net"])) {
    const id = bttvId(url.pathname);
    if (!id) throw notAnEmote("BTTV");
    return { url: `https://cdn.betterttv.net/emote/${id}/3x`, name: id, source: "BTTV" };
  }
  return { url: url.href, name: lastSegmentName(url), source: host };
};

const EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// The bytes decide, as in loadMediaFile: CDNs often answer with a generic type
const sniffType = (bytes: Uint8Array) => {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 3) === "GIF") return "image/gif";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
};

const fileName = (name: string, type: string) =>
  `${name.replace(/[/\\:*?"<>|]+/g, "_") || "image"}.${EXTENSIONS[type] ?? "png"}`;

type FetchMediaLinkOptions = {
  maxBytes: number;
  signal?: AbortSignal;
  /** What is happening right now, for the line under the field. */
  onStatus?: (status: string) => void;
  /** The link is the file itself (an emote's file from the panel): no provider lookup. */
  name?: string;
};

/**
 * Fetches the file behind a link from the browser (no server in between, see
 * docs/web/editor.md) and checks it like a dropped file: GIF, PNG, JPEG or WebP, at most
 * `maxBytes`. Throws `MediaLinkError` with a message for the field.
 */
export const fetchMediaLink = async (
  text: string,
  { maxBytes, signal, onStatus, name }: FetchMediaLinkOptions
) => {
  const url = parseMediaLink(text);
  if (!url) {
    throw new MediaLinkError(
      "invalid",
      "that isn't a link. it should start with https://"
    );
  }

  let target: Target;
  if (name) {
    target = { url: url.href, name, source: url.hostname };
  } else {
    onStatus?.(`reading ${url.hostname}`);
    target = await resolveTarget(url, signal);
  }
  onStatus?.(`downloading ${target.name}`);

  let response: Response;
  try {
    response = await fetch(target.url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    // A missing CORS header and a dead network fail the same way here
    throw new MediaLinkError(
      "unreadable",
      `${target.source} doesn't let the browser read this file. download it, then drop it here`
    );
  }
  if (response.status === 404) {
    throw new MediaLinkError("not-found", "there's no file at that link anymore");
  }
  if (!response.ok) {
    throw new MediaLinkError(
      "failed",
      `${target.source} answered with an error (${response.status}). try again in a moment`
    );
  }

  const tooBig = (bytes: number) =>
    new MediaLinkError(
      "too-big",
      `that file is ${formatBytes(bytes)} and the editor takes up to ${formatBytes(maxBytes)}`
    );
  const length = Number(response.headers.get("content-length"));
  if (length > maxBytes) {
    void response.body?.cancel();
    throw tooBig(length);
  }
  const unsupported = () =>
    new MediaLinkError("type", "that file isn't a GIF, PNG, JPEG or WebP image");
  // Rejected before downloading; a generic or missing type is left to the bytes
  const declared = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (declared === "text/html") {
    void response.body?.cancel();
    throw new MediaLinkError(
      "page",
      "that link opens a page, not an image. open the image itself and copy its link"
    );
  }
  if (declared && declared !== "application/octet-stream" && !(declared in EXTENSIONS)) {
    void response.body?.cancel();
    throw unsupported();
  }

  const blob = await response.blob();
  if (blob.size > maxBytes) throw tooBig(blob.size);
  const type = sniffType(new Uint8Array(await blob.slice(0, 12).arrayBuffer()));
  if (!type) throw unsupported();
  return new File([blob], fileName(target.name, type), { type });
};
