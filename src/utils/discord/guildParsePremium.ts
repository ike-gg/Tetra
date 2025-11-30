import { APIGuild, Guild, GuildPremiumTier } from "discord.js";

const parseFileLimit = (tier: GuildPremiumTier): number => {
  switch (tier) {
    case GuildPremiumTier.Tier3:
      return 104857600;
    case GuildPremiumTier.Tier2:
      return 52428800;
    default:
      return 8388608;
  }
};

const parseEmoteLimit = (tier: GuildPremiumTier): number => {
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

export const guildParsePremium = (guild: Guild) => {
  const emoteLimit = parseEmoteLimit(guild.premiumTier);
  const fileLimit = parseFileLimit(guild.premiumTier);

  const discordEmotes = guild.emojis.cache.filter((e) => e.deletable);

  const emoteAnimated = discordEmotes.filter((e) => e.animated).size;
  const emoteStatic = discordEmotes.filter((e) => !e.animated).size;

  return {
    fileLimit,
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
  const emoteLimit = parseEmoteLimit(guild.premium_tier);
  const fileLimit = parseFileLimit(guild.premium_tier);

  return {
    fileLimit,
    emoteLimit,
    level: guild.premium_tier,
  };
};
