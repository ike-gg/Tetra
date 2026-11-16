import { z } from "zod";

import { getTwitchChannel } from "@/emotes/lookup/twitch-channel-lookup";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { withLookupErrors } from "../emotes/emotes.shared";
import { twitchLoginSchema } from "./twitch.shared";

const channelParamsSchema = z.object({ login: twitchLoginSchema });

/** One Twitch channel by login, so a `?channel=<login>` link resolves to its id. */
export const twitchGetChannel = authFactory.createHandlers(
  requireAuth,
  validate("param", channelParamsSchema),
  async (c) => {
    const { login } = c.req.valid("param");
    const channel = await withLookupErrors(() => getTwitchChannel(login));
    return c.json(channel, 200);
  }
);
