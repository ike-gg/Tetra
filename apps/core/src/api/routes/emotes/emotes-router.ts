import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { emotesResolveEmote } from "./emotes.resolve-emote";
import { emotesSearchEmotes } from "./emotes.search-emotes";

export const emotesRouter = new Hono<AppEnv>()
  .get("/resolve", ...emotesResolveEmote)
  .get("/search", ...emotesSearchEmotes);
