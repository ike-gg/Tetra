import { Request, Response } from "express";
import { PermissionsBitField } from "discord.js";
import parseToken from "../middleware/parseToken";
import { client } from "../..";

export default async (req: Request, res: Response) => {
  const userDetails = parseToken(req.cookies.token);
  const guildId = req.params.guildId;

  if (!guildId) {
    res.sendStatus(200);
    return;
  }

  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `${userDetails.token_type} ${userDetails.access_token}`,
      },
    });

    if (!response.ok) {
      res.sendStatus(500);
    }

    const userGuilds = (await response.json()) as {
      id: string;
      name: string;
      icon: string;
      permissions: number;
    }[];

    const filteredGuildsWithPermissions = userGuilds.filter((guild) => {
      const permissionBit = BigInt(guild.permissions);
      const permissions = new PermissionsBitField(permissionBit);
      return permissions.has("ManageEmojisAndStickers");
    });

    const guildDetails = filteredGuildsWithPermissions.find(
      (guild) => guild.id === guildId
    );

    if (!guildDetails) {
      res.sendStatus(401);
      return;
    }

    const guildBotSide = client.guilds.cache.find(
      (guild) => guild.id === guildDetails.id
    );

    if (!guildBotSide) {
      res.sendStatus(401);
      return;
    }

    res.json(guildBotSide.emojis.cache);
  } catch (error) {
    res.sendStatus(500);
  }
};
