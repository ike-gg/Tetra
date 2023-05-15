import { Request, Response } from "express";
import { PermissionsBitField } from "discord.js";
import parseToken from "../middleware/parseToken";
import { bigint } from "zod";
import { client } from "../..";

export default async (req: Request, res: Response) => {
  const userDetails = parseToken(req.cookies.token);
  console.log(userDetails);
  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `${userDetails.token_type} ${userDetails.access_token}`,
      },
    });

    if (!response.ok) {
      res.sendStatus(500);
      return;
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

    const tetraGuildsIds = client.guilds.cache.map((guild) => guild.id);

    const commonTetraGuilds = filteredGuildsWithPermissions.filter((guild) =>
      tetraGuildsIds.includes(guild.id)
    );

    res.json(commonTetraGuilds);
  } catch (error) {
    res.sendStatus(500);
  }
};
