import OAuth from "discord-oauth2";
import { PermissionsBitField } from "discord.js";
import { NextFunction, Request, Response } from "express";

import { discordOauth, shardingManager } from "@/index";

import { TetraAPIError } from "../../TetraAPIError";

const transformGuildOauth = (guild: OAuth.PartialGuild) => {
  const { features, ...rest } = guild;
  return { ...rest };
};

export const guildsGetGuilds = async (req: Request, res: Response, _: NextFunction) => {
  let userGuilds: OAuth.PartialGuild[];
  try {
    userGuilds = await discordOauth.getUserGuilds(req.accessToken!);
  } catch (error) {
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
