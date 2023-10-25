import { Request, Response } from "express";
import DiscordOauth2 from "discord-oauth2";
import { client, discordOauth } from "../..";
import { PermissionsBitField } from "discord.js";
import { bigint } from "zod";

export default async (req: Request, res: Response) => {
  const accessToken = res.locals.accessToken as string;

  const userGuilds = await discordOauth.getUserGuilds(accessToken);
  const tetraGuilds = client.guilds.cache.map((g) => g.id);

  const guildsWithoutTetra = userGuilds.filter(
    (guild) => !tetraGuilds.includes(guild.id)
  );
  const guildsWithTetra = userGuilds.filter((guild) =>
    tetraGuilds.includes(guild.id)
  );

  const guilds = guildsWithTetra.filter((guild) => {
    const userPermissions = new PermissionsBitField(BigInt(guild.permissions!));
    return !userPermissions.has("ManageEmojisAndStickers");
  });

  const managingGuilds = guildsWithTetra.filter((guild) => {
    const userPermissions = new PermissionsBitField(BigInt(guild.permissions!));
    return userPermissions.has("ManageEmojisAndStickers");
  });

  const guildsMissingTetra = guildsWithoutTetra.filter((guild) => {
    const userPermissions = new PermissionsBitField(BigInt(guild.permissions!));
    return userPermissions.has("ManageGuild");
  });

  res.status(200).json({ guilds, managingGuilds, guildsMissingTetra });
};
