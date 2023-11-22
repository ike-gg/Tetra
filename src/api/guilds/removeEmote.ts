import { NextFunction, Request, Response } from "express";
import { client, discordOauth } from "../..";
import { TetraAPIError } from "../TetraAPIError";

export default async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = res.locals.accessToken as string;

  const { guildid, emoteid } = req.params;

  try {
    if (!guildid || !emoteid) throw new TetraAPIError(400, "Bad request");

    const user = await discordOauth.getUser(accessToken);

    if (!user) throw new TetraAPIError(401, "Not authorized");

    const guild = await client.guilds.fetch(guildid);

    if (!guild) throw new TetraAPIError(403, "Forbidden.");

    const userInGuild = await guild.members.fetch(user.id);

    if (!userInGuild)
      throw new TetraAPIError(401, "Not authorized. Not found user in guild.");

    const hasPermissions = userInGuild.permissions.has(
      "ManageEmojisAndStickers"
    );

    if (!hasPermissions)
      throw new TetraAPIError(
        401,
        "Not authorized. Missing permissions in guild."
      );

    const emoteInGuild = await guild.emojis.fetch(emoteid);

    if (!emoteInGuild)
      throw new TetraAPIError(400, "Bad request. Emote not found.");

    const removedEmote = await emoteInGuild.delete();
    res.status(200).json({ message: `Removed ${removedEmote.name} emote.` });
  } catch (e) {
    next(e);
  }
};
