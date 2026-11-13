import { PermissionsBitField } from "discord.js";
import type OAuth from "discord-oauth2";
import type { NextFunction, Request, Response } from "express";

import { discordOauth } from "@/lib/discord-oauth";
import { shardingManager } from "@/lib/sharding-manager";

import { TetraAPIError } from "../../tetra-api-error";

const transformGuildOauth = (guild: OAuth.PartialGuild) => {
  const { features, ...rest } = guild;
  return { ...rest };
};

export const guildsGetGuilds = async (req: Request, res: Response, _: NextFunction) => {
  let userGuilds: OAuth.PartialGuild[];
  try {
    userGuilds = await discordOauth.getUserGuilds(req.accessToken!);
  } catch {
    throw new TetraAPIError(401, "Unauthorized", "OAUTH_FAILED_GET_USER_GUILDS");
  }

  const allTetraGuilds = await shardingManager.broadcastEval((client) => {
    return client.guilds.cache.map((g) => g.id);
  });

  const tetraGuilds = allTetraGuilds.flat();

  const guildsWithoutTetra = userGuilds.filter(
    (guild) => !tetraGuilds.includes(guild.id)
  );
  const guildsWithTetra = userGuilds.filter((guild) => tetraGuilds.includes(guild.id));

  const guildsWithBot = guildsWithTetra
    .filter((guild) => {
      const userPermissions = new PermissionsBitField(BigInt(guild.permissions!));
      return !userPermissions.has("ManageGuildExpressions");
    })
    .map(transformGuildOauth);

  const guildsWithUserPermissions = guildsWithTetra
    .filter((guild) => {
      const userPermissions = new PermissionsBitField(BigInt(guild.permissions!));
      return userPermissions.has("ManageGuildExpressions");
    })
    .map(transformGuildOauth);

  const guildsWithoutBotAvailableToAdd = guildsWithoutTetra
    .filter((guild) => {
      const userPermissions = new PermissionsBitField(BigInt(guild.permissions!));
      return userPermissions.has("ManageGuild");
    })
    .map(transformGuildOauth);

  res.json({
    guildsWithBot,
    guildsWithUserPermissions,
    guildsWithoutBotAvailableToAdd,
  });
};
