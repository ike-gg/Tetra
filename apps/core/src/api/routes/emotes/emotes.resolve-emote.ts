import { z } from "zod";

import { resolveEmoteLink } from "@/emotes/lookup/resolve-emote-link";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { withLookupErrors } from "./emotes.shared";

const resolveQuerySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/** A pasted emote link (7TV, BTTV, FFZ, Twitch, Discord, image) as one emote. */
export const emotesResolveEmote = authFactory.createHandlers(
  requireAuth,
  validate("query", resolveQuerySchema),
  async (c) => {
    const { url } = c.req.valid("query");
    const emote = await withLookupErrors(() => resolveEmoteLink(url));
    return c.json(emote, 200);
  }
);
