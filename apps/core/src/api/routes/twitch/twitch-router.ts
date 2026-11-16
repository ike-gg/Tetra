import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { twitchGetChannel } from "./twitch.get-channel";
import { twitchGetChannelEmotes } from "./twitch.get-channel-emotes";
import { twitchSearchChannels } from "./twitch.search-channels";

export const twitchRouter = new Hono<AppEnv>()
  .get("/channels", ...twitchSearchChannels)
  .get("/channels/:login", ...twitchGetChannel)
  .get("/channels/:channelId/emotes", ...twitchGetChannelEmotes);
