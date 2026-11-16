import { z } from "zod";

import { getTwitchChannelEmotes } from "@/emotes/lookup/twitch-channel-lookup";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { withLookupErrors } from "../emotes/emotes.shared";
import { twitchChannelIdSchema } from "./twitch.shared";

const emotesParamsSchema = z.object({ channelId: twitchChannelIdSchema });

/** A channel's own Twitch emotes (follower, subscriber, bits) by Twitch user id. */
export const twitchGetChannelEmotes = authFactory.createHandlers(
  requireAuth,
  validate("param", emotesParamsSchema),
  async (c) => {
    const { channelId } = c.req.valid("param");
    const emotes = await withLookupErrors(() => getTwitchChannelEmotes(channelId));
    return c.json({ emotes }, 200);
  }
);
