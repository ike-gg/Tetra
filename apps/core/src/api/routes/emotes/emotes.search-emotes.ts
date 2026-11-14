import { z } from "zod";

import { searchEmotes, searchProviderSchema } from "@/emotes/lookup/search-emotes";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { withLookupErrors } from "./emotes.shared";

const searchQuerySchema = z.object({
  provider: searchProviderSchema,
  query: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

/** One page of a provider's search; an empty query lists popular emotes. */
export const emotesSearchEmotes = authFactory.createHandlers(
  requireAuth,
  validate("query", searchQuerySchema),
  async (c) => {
    const { provider, query, page } = c.req.valid("query");
    const result = await withLookupErrors(() => searchEmotes(provider, query, page));
    return c.json(result, 200);
  }
);
