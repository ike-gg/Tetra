import { z } from "zod";

import { searchTwitchChannels } from "@/emotes/lookup/twitch-channel-lookup";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { withLookupErrors } from "../emotes/emotes.shared";

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
});

/** Twitch channel search for the panel's channel autocomplete (Helix, app token). */
export const twitchSearchChannels = authFactory.createHandlers(
  requireAuth,
  validate("query", searchQuerySchema),
  async (c) => {
    const { query } = c.req.valid("query");
    const channels = await withLookupErrors(() => searchTwitchChannels(query));
    return c.json({ channels }, 200);
  }
);
