import { Router } from "express";
import { guildsGetGuilds } from "./guilds.get-guilds";
import { guildsGetGuild } from "./guilds.get-guild";
import { guildsPostEmote } from "./guilds.post-emote";

export const guildsRouter = Router();

guildsRouter.get("/", guildsGetGuilds);
guildsRouter.get("/:guildId", guildsGetGuild);
guildsRouter.post("/:guildId/emote", guildsPostEmote);
