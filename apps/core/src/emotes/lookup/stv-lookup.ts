import { z } from "zod";

import { stvGetUrlById } from "../source/7tv/helpers/constants";
import type { CatalogEmote } from "./catalog-emote";
import {
  emoteNotFound,
  fetchUpstream,
  readUpstreamJson,
  upstreamError,
} from "./upstream";

const PROVIDER = "7TV";

const stvEmoteSchema = z.object({
  id: z.string(),
  name: z.string(),
  animated: z.boolean(),
  host: z.object({
    url: z.string(),
    files: z
      .array(z.object({ name: z.string(), width: z.number(), height: z.number() }))
      .optional(),
  }),
});

type StvEmote = z.infer<typeof stvEmoteSchema>;

const SIZES = ["4x", "3x", "2x", "1x"];

/**
 * 4x is 128 px high, Discord's maximum. GIF for animations (gifsicle's native format),
 * PNG for static images, WebP when those aren't listed.
 */
const pickFile = (emote: StvEmote) => {
  const files = emote.host.files ?? [];
  const formats = emote.animated ? ["gif", "webp"] : ["png", "webp"];

  for (const format of formats) {
    for (const size of SIZES) {
      const file = files.find((candidate) => candidate.name === `${size}.${format}`);
      if (file) return file;
    }
  }

  // Older responses without `files`: the bot's fixed naming
  return {
    name: `4x.${emote.animated ? "gif" : "webp"}`,
    width: undefined,
    height: undefined,
  };
};

const toCatalogEmote = (emote: StvEmote): CatalogEmote => {
  const base = `https:${emote.host.url.replace(/^https?:/, "")}`;
  const file = pickFile(emote);

  return {
    id: emote.id,
    name: emote.name,
    // Animated WebP plays in every browser the panel supports and is much smaller than GIF
    previewUrl: `${base}/2x.webp`,
    url: `${base}/${file.name}`,
    animated: emote.animated,
    source: "7tv",
    width: file.width,
    height: file.height,
  };
};

export const stvResolveEmote = async (id: string) => {
  const response = await fetchUpstream(PROVIDER, stvGetUrlById(encodeURIComponent(id)));

  if (response.status === 404 || response.status === 400) throw emoteNotFound();
  if (!response.ok) throw upstreamError(PROVIDER);

  const emote = await readUpstreamJson(PROVIDER, response, stvEmoteSchema);
  if (/^0+$/.test(emote.id)) throw emoteNotFound();

  return toCatalogEmote(emote);
};
