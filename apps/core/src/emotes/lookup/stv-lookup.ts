import { z } from "zod";

import { stvGetGraphqlUrl, stvGetUrlById } from "../source/7tv/helpers/constants";
import type { CatalogEmote } from "./catalog-emote";
import {
  emoteNotFound,
  fetchUpstream,
  readUpstreamJson,
  upstreamError,
} from "./upstream";

const PROVIDER = "7TV";

// v3 caps `limit` at 100 and `page` at 100
export const STV_PAGE_SIZE = 60;
const STV_MAX_PAGE = 100;

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

export const toCatalogEmote = (emote: StvEmote): CatalogEmote => {
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

// The search text goes in as a variable, never into the document
const SEARCH_QUERY = `
  query ($query: String!, $page: Int, $limit: Int, $filter: EmoteSearchFilter) {
    emotes(query: $query, page: $page, limit: $limit, filter: $filter) {
      count
      items {
        id
        name
        animated
        host {
          url
          files {
            name
            width
            height
          }
        }
      }
    }
  }
`;

const searchResponseSchema = z.object({
  data: z
    .object({
      emotes: z.object({ count: z.number(), items: z.array(stvEmoteSchema) }),
    })
    .nullable()
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

/** Empty query: the `TOP` category (all-time most used). */
export const stvSearchEmotes = async (query: string, page: number) => {
  const response = await fetchUpstream(PROVIDER, stvGetGraphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: {
        query,
        page,
        limit: STV_PAGE_SIZE,
        filter: query ? undefined : { category: "TOP" },
      },
    }),
  });

  if (!response.ok) throw upstreamError(PROVIDER);

  const body = await readUpstreamJson(PROVIDER, response, searchResponseSchema);

  // 70429 = "no emotes found" in older v3 versions; today an empty list comes back
  if (body.errors?.some((error) => error.message.includes("70429"))) {
    return { items: [], nextPage: null };
  }
  if (body.errors?.length || !body.data) throw upstreamError(PROVIDER);

  const { count, items } = body.data.emotes;
  const hasMore = page < STV_MAX_PAGE && page * STV_PAGE_SIZE < count;

  return { items: items.map(toCatalogEmote), nextPage: hasMore ? page + 1 : null };
};
