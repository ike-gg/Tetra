import { Router } from "express";
import { guildsGetGuilds } from "./guilds.get-guilds";
import { guildsGetGuild } from "./guilds.get-guild";
import { guildsPostEmote } from "./guilds.post-emote";
import { guildsRemoveEmote } from "./guilds.remove-emote";
import { guildsGetRemovedEmotes } from "./guilds.get-removed-emotes";

export const guildsRouter = Router();

guildsRouter.get("/", guildsGetGuilds);
guildsRouter.get("/:guildId", guildsGetGuild);
guildsRouter.post("/:guildId/emote", guildsPostEmote);
guildsRouter.get("/:guildId/removed", guildsGetRemovedEmotes);
guildsRouter.delete("/:guildId/emote/:emoteId", guildsRemoveEmote);
