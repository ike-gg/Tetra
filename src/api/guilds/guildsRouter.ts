import { Router } from "express";
import listGuilds from "./listGuilds";
import removeEmote from "./removeEmote";
import addEmote from "./addEmote";
import getGuild from "./getGuild";

const guildsRouter = Router();

guildsRouter.get("/", listGuilds);
guildsRouter.get("/:guildid", getGuild);
guildsRouter.post("/:guildid", addEmote);
guildsRouter.delete("/:guildid/:emoteid", removeEmote);

export default guildsRouter;
