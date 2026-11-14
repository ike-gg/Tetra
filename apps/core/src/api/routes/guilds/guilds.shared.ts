import { type Client, type GuildPremiumTier, PermissionsBitField } from "discord.js";
import { z } from "zod";

import { getUserGuilds } from "@/lib/discord-oauth/user-guilds-cache";
import { discordRestApi } from "@/lib/discord-rest-api";

import type { AuthEnv } from "../../api-env";
import { TetraAPIError } from "../../tetra-api-error";

export const guildParamsSchema = z.object({
  guildId: z.string(),
});

/**
 * Loads the guild through the bot and checks that the user is in it with
 * `ManageGuildExpressions`. Throws the matching API error otherwise.
 */
export const getManageableGuild = async (
  guildId: string,
  {
    accessToken,
    discordUserId,
  }: Pick<AuthEnv["Variables"], "accessToken" | "discordUserId">
) => {
  const [guildResult, userGuildsResult] = await Promise.allSettled([
    discordRestApi.guilds.get(guildId),
    getUserGuilds(discordUserId, accessToken),
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

export type ShardGuildEmojiSlots = {
  id: string;
  static: number;
  animated: number;
  premiumTier: GuildPremiumTier;
  features: string[];
};

/**
 * Runs inside the shards through `broadcastEval`: it is serialized, so it must not use
 * anything from module scope. Returns only the requested guilds the shard has, with
 * emoji counts instead of emoji objects to keep the IPC payload small. Application
 * emojis live in `client.application.emojis`, not in `guild.emojis`, so they are not
 * counted; managed emojis (Twitch integration) don't take slots.
 */
export const collectGuildEmojiSlots = (
  client: Client,
  { guildIds }: { guildIds: string[] }
): ShardGuildEmojiSlots[] => {
  const result: ShardGuildEmojiSlots[] = [];
  for (const id of guildIds) {
    const guild = client.guilds.cache.get(id);
    if (!guild) continue;
    let staticCount = 0;
    let animatedCount = 0;
    for (const emoji of guild.emojis.cache.values()) {
      if (emoji.managed) continue;
      if (emoji.animated) animatedCount++;
      else staticCount++;
    }
    result.push({
      id,
      static: staticCount,
      animated: animatedCount,
      premiumTier: guild.premiumTier,
      features: (guild.features as string[]).filter(
        (feature) => feature === "MORE_EMOJI"
      ),
    });
  }
  return result;
};
