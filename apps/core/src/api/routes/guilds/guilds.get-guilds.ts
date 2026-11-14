import { PermissionsBitField } from "discord.js";
import type OAuth from "discord-oauth2";

import { discordOauth } from "@/lib/discord-oauth";
import { shardingManager } from "@/lib/sharding-manager";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";

const toApiGuild = ({ features: _, ...guild }: OAuth.PartialGuild) => guild;

const hasPermission = (
  guild: OAuth.PartialGuild,
  permission: "ManageGuildExpressions" | "ManageGuild"
) => new PermissionsBitField(BigInt(guild.permissions ?? 0)).has(permission);

export const guildsGetGuilds = authFactory.createHandlers(requireAuth, async (c) => {
  let userGuilds: OAuth.PartialGuild[];
  try {
    userGuilds = await discordOauth.getUserGuilds(c.get("accessToken"));
  } catch {
    throw new TetraAPIError(401, "Unauthorized", "OAUTH_FAILED_GET_USER_GUILDS");
  }

  const tetraGuildIds = new Set(
    (
      await shardingManager.broadcastEval((client) =>
        client.guilds.cache.map((g) => g.id)
      )
    ).flat()
  );

  const guildsWithTetra = userGuilds.filter((guild) => tetraGuildIds.has(guild.id));
  const guildsWithoutTetra = userGuilds.filter((guild) => !tetraGuildIds.has(guild.id));

  return c.json(
    {
      guildsWithBot: guildsWithTetra
        .filter((guild) => !hasPermission(guild, "ManageGuildExpressions"))
        .map(toApiGuild),
      guildsWithUserPermissions: guildsWithTetra
        .filter((guild) => hasPermission(guild, "ManageGuildExpressions"))
        .map(toApiGuild),
      guildsWithoutBotAvailableToAdd: guildsWithoutTetra
        .filter((guild) => hasPermission(guild, "ManageGuild"))
        .map(toApiGuild),
    },
    200
  );
});
