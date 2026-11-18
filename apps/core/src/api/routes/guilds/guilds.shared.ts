import { type Client, type GuildPremiumTier, PermissionsBitField } from "discord.js";
import { gte } from "drizzle-orm";
import { z } from "zod";

import { MAX_EMOTE_SIZE } from "@/constants";
import { EmoteTooLargeError } from "@/constants/errors";
import { RETENTION, retentionCutoff } from "@/constants/retention";
import { removedEmotes } from "@/db/schema";
import { getUserGuilds } from "@/lib/discord-oauth/user-guilds-cache";
import { discordRestApi } from "@/lib/discord-rest-api";

import type { AuthEnv } from "../../api-env";
import { EMOTE_NAME_REGEX } from "../../constants/api-constants";
import { TetraAPIError } from "../../tetra-api-error";

export const guildParamsSchema = z.object({
  guildId: z.string(),
});

/** A finished emote file from the browser editor, uploaded to Discord as-is. */
/** Expired removed emotes are hidden and can't be restored, even before the cleanup runs. */
export const notExpiredRemovedEmote = () =>
  gte(removedEmotes.removedAt, retentionCutoff(RETENTION.REMOVED_EMOTE_MAX_AGE));

export const readyEmoteBodySchema = z.object({
  emote: z
    .string()
    .regex(
      /^data:image\/(gif|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
      "Expected a base64 gif/png/webp data URL"
    ),
  name: z.string().regex(EMOTE_NAME_REGEX),
});

const decodedBase64Size = (dataUrl: string) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

/**
 * Fails early with the same code as Discord's own size errors (`EmoteTooLargeError` is
 * mapped by type), without spending a Discord request.
 */
export const assertReadyEmoteFits = (dataUrl: string) => {
  if (decodedBase64Size(dataUrl) > MAX_EMOTE_SIZE) {
    throw new EmoteTooLargeError("The emote must be 256 KB or smaller.");
  }
};

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
