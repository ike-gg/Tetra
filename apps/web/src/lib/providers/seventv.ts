import { z } from "zod";

import type { CatalogEmote } from "@/lib/catalog";
import {
  MAX_PAGE,
  PAGE_SIZE,
  ProviderError,
  requestProviderJson,
  type SearchPage,
} from "@/lib/providers/provider-request";

const PROVIDER = "7TV";
const GQL_URL = "https://7tv.io/v3/gql";

const emoteSchema = z.object({
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

type StvEmote = z.infer<typeof emoteSchema>;

const responseSchema = z.object({
  data: z
    .object({ emotes: z.object({ count: z.number(), items: z.array(emoteSchema) }) })
    .nullable()
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

// The search text goes in as a variable, never into the document
const SEARCH_QUERY = `
  query ($query: String!, $page: Int, $limit: Int, $filter: EmoteSearchFilter) {
    emotes(query: $query, page: $page, limit: $limit, filter: $filter) {
      count
      items { id name animated host { url files { name width height } } }
    }
  }
`;

const SIZES = ["4x", "3x", "2x", "1x"];

// Same pick as core's stv-lookup: 4x is Discord's 128 px, GIF for animations (gifsicle's
// format), PNG for stills, WebP when those aren't listed
const pickFile = (emote: StvEmote) => {
  const files = emote.host.files ?? [];
  const formats = emote.animated ? ["gif", "webp"] : ["png", "webp"];
  for (const format of formats) {
    for (const size of SIZES) {
      const file = files.find((candidate) => candidate.name === `${size}.${format}`);
      if (file) return file;
    }
  }
  return {
    name: `4x.${emote.animated ? "gif" : "webp"}`,
    width: undefined,
    height: undefined,
  };
};

const toCatalogEmote = (emote: StvEmote): CatalogEmote => {
  // cdn.7tv.app: on core's allowed source hosts, so `url` can go to the add endpoint as is
  const base = `https:${emote.host.url.replace(/^https?:/, "")}`;
  const file = pickFile(emote);
  return {
    id: emote.id,
    name: emote.name,
    previewUrl: `${base}/2x.webp`,
    url: `${base}/${file.name}`,
    animated: emote.animated,
    source: "7tv",
    width: file.width,
    height: file.height,
  };
};

/** 7TV's v3 GraphQL search from the browser; an empty query lists the `TOP` category. */
export const searchSevenTv = async (
  query: string,
  page: number,
  signal?: AbortSignal
): Promise<SearchPage> => {
  const body = await requestProviderJson(PROVIDER, GQL_URL, responseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: {
        query,
        page,
        limit: PAGE_SIZE,
        filter: query ? undefined : { category: "TOP" },
      },
    }),
    signal,
  });

  // 70429 = "no emotes found" in older v3 versions; today an empty list comes back
  if (body.errors?.some((error) => error.message.includes("70429"))) {
    return { items: [], nextPage: null };
  }
  if (body.errors?.length || !body.data) throw new ProviderError(PROVIDER, "failed");

  const { count, items } = body.data.emotes;
  const hasMore = page < MAX_PAGE && page * PAGE_SIZE < count;
  return { items: items.map(toCatalogEmote), nextPage: hasMore ? page + 1 : null };
};

const channelSchema = z.object({
  emote_set: z
    .object({
      emotes: z
        .array(
          z.object({
            // The channel's alias, which chat uses; `data.name` is the emote's own name
            name: z.string(),
            data: emoteSchema.nullable().optional(),
          })
        )
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

/** The emotes in a Twitch channel's active 7TV set; 404 when the channel has no 7TV account. */
export const getSevenTvChannelEmotes = async (
  twitchId: string,
  signal?: AbortSignal
): Promise<CatalogEmote[]> => {
  const body = await requestProviderJson(
    PROVIDER,
    `https://7tv.io/v3/users/twitch/${encodeURIComponent(twitchId)}`,
    channelSchema,
    { signal }
  );
  return (body.emote_set?.emotes ?? []).flatMap(({ name, data }) =>
    data ? [toCatalogEmote({ ...data, name })] : []
  );
};
