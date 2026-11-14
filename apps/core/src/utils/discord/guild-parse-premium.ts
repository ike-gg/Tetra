import { type APIGuild, type Guild, GuildPremiumTier } from "discord.js";

const tierEmojiLimit = (tier: GuildPremiumTier): number => {
  switch (tier) {
    case GuildPremiumTier.Tier3:
      return 250;
    case GuildPremiumTier.Tier2:
      return 150;
    case GuildPremiumTier.Tier1:
      return 100;
    default:
      return 50;
  }
};

/**
 * Emoji slots per type (static and animated count separately). `MORE_EMOJI` is an
 * undocumented feature of some old partnered/verified guilds that raises the base to 200,
 * the same rule discord.py uses for `Guild.emoji_limit`.
 */
export const getEmojiSlotLimit = (
  tier: GuildPremiumTier,
  features: readonly string[] = []
): number => Math.max(features.includes("MORE_EMOJI") ? 200 : 50, tierEmojiLimit(tier));

export const guildParsePremium = (guild: Guild) => {
  const emoteLimit = getEmojiSlotLimit(guild.premiumTier, guild.features);

  // Managed emojis (e.g. Twitch integration) do not take slots
  const discordEmotes = guild.emojis.cache.filter((e) => !e.managed);

  const emoteAnimated = discordEmotes.filter((e) => e.animated).size;
  const emoteStatic = discordEmotes.filter((e) => !e.animated).size;

  return {
    emoteLimit,
    emotes: {
      animated: {
        used: emoteAnimated,
        free: Math.max(emoteLimit - emoteAnimated, 0),
      },
      static: {
        used: emoteStatic,
        free: Math.max(emoteLimit - emoteStatic, 0),
      },
    },
    level: guild.premiumTier,
  };
};

export const basicGuildParsePremium = (guild: APIGuild) => {
  const emoteLimit = getEmojiSlotLimit(guild.premium_tier, guild.features);

  return {
    emoteLimit,
    level: guild.premium_tier,
  };
};
