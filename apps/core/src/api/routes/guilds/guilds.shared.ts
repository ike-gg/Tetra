import { PermissionsBitField } from "discord.js";
import { z } from "zod";

import { discordOauth } from "@/lib/discord-oauth";
import { discordRestApi } from "@/lib/discord-rest-api";

import { TetraAPIError } from "../../tetra-api-error";

export const guildParamsSchema = z.object({
  guildId: z.string(),
});

/**
 * Loads the guild through the bot and checks that the user is in it with
 * `ManageGuildExpressions`. Throws the matching API error otherwise.
 */
export const getManageableGuild = async (guildId: string, accessToken: string) => {
  const [guildResult, userGuildsResult] = await Promise.allSettled([
    discordRestApi.guilds.get(guildId),
    discordOauth.getUserGuilds(accessToken),
  ]);

  if (guildResult.status === "rejected") {
    throw new TetraAPIError(404, "Guild not found", "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT");
  }

  if (userGuildsResult.status === "rejected") {
    throw new TetraAPIError(404, "Guild not found", "OAUTH_GET_GUILDS_ERROR");
  }

  const userGuild = userGuildsResult.value.find((guild) => guild.id === guildId);

  if (!userGuild) {
    throw new TetraAPIError(404, "Guild not found", "USER_NOT_IN_GUILD");
  }

  const userPermissions = new PermissionsBitField(BigInt(userGuild.permissions ?? 0));

  if (!userPermissions.has("ManageGuildExpressions")) {
    throw new TetraAPIError(403, "Missing permissions", "MISSING_PERMISSIONS");
  }

  return guildResult.value;
};
