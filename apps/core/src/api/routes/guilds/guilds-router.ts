import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { guildsGetGuild } from "./guilds.get-guild";
import { guildsGetGuilds } from "./guilds.get-guilds";
import { guildsGetRemovedEmotes } from "./guilds.get-removed-emotes";
import { guildsPostEmote } from "./guilds.post-emote";
import { guildsRemoveEmote } from "./guilds.remove-emote";
import { guildsRestoreEmote } from "./guilds.restore-emote";

export const guildsRouter = new Hono<AppEnv>()
  .get("/", ...guildsGetGuilds)
  .get("/:guildId", ...guildsGetGuild)
  .post("/:guildId/emote", ...guildsPostEmote)
  .get("/:guildId/removed", ...guildsGetRemovedEmotes)
  .post("/:guildId/restore/:restoreId", ...guildsRestoreEmote)
  .delete("/:guildId/emote/:emoteId", ...guildsRemoveEmote);
