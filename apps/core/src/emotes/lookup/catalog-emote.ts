import { z } from "zod";

export const catalogEmoteSourceSchema = z.enum([
  "discord",
  "7tv",
  "bttv",
  "ffz",
  "twitch",
  "link",
]);

export type CatalogEmoteSource = z.infer<typeof catalogEmoteSourceSchema>;

/**
 * An emote found by link or search, in the panel's shape. `url` is the file to add
 * (accepted by `assertAllowedEmoteSourceUrl`), `previewUrl` a smaller file for display.
 * `name` is the source's own name (not necessarily a valid Discord emoji name), or a
 * guess from the link when the source has none. `animated` comes from the source and is a
 * guess for plain links; the add endpoint reads it from the file.
 */
export const catalogEmoteSchema = z.object({
  id: z.string(),
  name: z.string(),
  previewUrl: z.string(),
  url: z.string(),
  animated: z.boolean(),
  source: catalogEmoteSourceSchema,
  width: z.number().optional(),
  height: z.number().optional(),
});

export type CatalogEmote = z.infer<typeof catalogEmoteSchema>;

export type EmoteLookupErrorCode =
  | "UNSUPPORTED_LINK"
  | "EMOTE_NOT_FOUND"
  | "URL_NOT_ALLOWED"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "UPSTREAM_ERROR"
  | "PROVIDER_UNAVAILABLE";

export class EmoteLookupError extends Error {
  constructor(
    public readonly code: EmoteLookupErrorCode,
    message: string
  ) {
    super(message);
    this.name = "EmoteLookupError";
  }
}

/** Name for sources without one: the link's last path segment, cut to Discord's rules. */
export const guessEmoteName = (url: URL) => {
  const segment = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Malformed escapes: keep the raw segment
  }
  const name = decoded
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return name.length >= 2 && !/^\d+$/.test(name) ? name : "emote";
};
