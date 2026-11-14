import { PermissionsBitField } from "discord.js";
import type OAuth from "discord-oauth2";

import { discordOauth } from "@/lib/discord-oauth";
import { shardingManager } from "@/lib/sharding-manager";
import { getEmojiSlotLimit } from "@/utils/discord/guild-parse-premium";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { collectGuildEmojiSlots, type ShardGuildEmojiSlots } from "./guilds.shared";

const toApiGuild = ({ features: _, ...guild }: OAuth.PartialGuild) => guild;

const toApiGuildWithEmojis = (
  guild: OAuth.PartialGuild,
  slots: ShardGuildEmojiSlots
) => ({
  ...toApiGuild(guild),
  emojis: {
    static: slots.static,
    animated: slots.animated,
    limit: getEmojiSlotLimit(slots.premiumTier, slots.features),
  },
});

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
