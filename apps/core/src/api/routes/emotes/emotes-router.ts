import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { emotesResolveEmote } from "./emotes.resolve-emote";

export const emotesRouter = new Hono<AppEnv>().get("/resolve", ...emotesResolveEmote);
