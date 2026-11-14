import { PermissionsBitField } from "discord.js";

import { getUserGuilds, type UserGuild } from "@/lib/discord-oauth/user-guilds-cache";
import { shardingManager } from "@/lib/sharding-manager";
import { getEmojiSlotLimit } from "@/utils/discord/guild-parse-premium";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { collectGuildEmojiSlots, type ShardGuildEmojiSlots } from "./guilds.shared";

const toApiGuild = (guild: UserGuild) => guild;

const toApiGuildWithEmojis = (guild: UserGuild, slots: ShardGuildEmojiSlots) => ({
  ...toApiGuild(guild),
  emojis: {
    static: slots.static,
    animated: slots.animated,
    limit: getEmojiSlotLimit(slots.premiumTier, slots.features),
  },
});

const hasPermission = (
  guild: UserGuild,
  permission: "ManageGuildExpressions" | "ManageGuild"
) => new PermissionsBitField(BigInt(guild.permissions ?? 0)).has(permission);

export const guildsGetGuilds = authFactory.createHandlers(requireAuth, async (c) => {
  let userGuilds: UserGuild[];
  try {
    userGuilds = await getUserGuilds(c.get("discordUserId"), c.get("accessToken"));
  } catch {
    throw new TetraAPIError(401, "Unauthorized", "OAUTH_FAILED_GET_USER_GUILDS");
  }

  // Only the user's guilds are looked up, so the payload doesn't grow with the bot
  const tetraGuilds = new Map(
    (
      await shardingManager.broadcastEval(collectGuildEmojiSlots, {
        context: { guildIds: userGuilds.map((guild) => guild.id) },
      })
    )
      .flat()
      .map((slots) => [slots.id, slots])
  );

  const guildsWithTetra = userGuilds.flatMap((guild) => {
    const slots = tetraGuilds.get(guild.id);
    return slots ? [{ guild, slots }] : [];
  });
  const guildsWithoutTetra = userGuilds.filter((guild) => !tetraGuilds.has(guild.id));

  return c.json(
    {
      guildsWithBot: guildsWithTetra
        .filter(({ guild }) => !hasPermission(guild, "ManageGuildExpressions"))
        .map(({ guild, slots }) => toApiGuildWithEmojis(guild, slots)),
      guildsWithUserPermissions: guildsWithTetra
        .filter(({ guild }) => hasPermission(guild, "ManageGuildExpressions"))
        .map(({ guild, slots }) => toApiGuildWithEmojis(guild, slots)),
      guildsWithoutBotAvailableToAdd: guildsWithoutTetra
        .filter((guild) => hasPermission(guild, "ManageGuild"))
        .map(toApiGuild),
    },
    200
  );
});
