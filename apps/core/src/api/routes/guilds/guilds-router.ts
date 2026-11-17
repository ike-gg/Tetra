import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { stvSyncRouter } from "../stv-sync/stv-sync-router";
import { guildsGetGuild } from "./guilds.get-guild";
import { guildsGetGuilds } from "./guilds.get-guilds";
import { guildsGetRemovedEmotes } from "./guilds.get-removed-emotes";
import { guildsPostEmote } from "./guilds.post-emote";
import { guildsRemoveEmote } from "./guilds.remove-emote";
import { guildsRestoreEmote } from "./guilds.restore-emote";
import { guildsUploadEmote } from "./guilds.upload-emote";

export const guildsRouter = new Hono<AppEnv>()
  .get("/", ...guildsGetGuilds)
  .get("/:guildId", ...guildsGetGuild)
  .post("/:guildId/emote", ...guildsPostEmote)
  .post("/:guildId/emote/upload", ...guildsUploadEmote)
  .get("/:guildId/removed", ...guildsGetRemovedEmotes)
  .post("/:guildId/restore/:restoreId", ...guildsRestoreEmote)
  .delete("/:guildId/emote/:emoteId", ...guildsRemoveEmote)
  .route("/:guildId/sync", stvSyncRouter);
