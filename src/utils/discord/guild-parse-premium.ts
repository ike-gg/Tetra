import { type APIGuild, type Guild, GuildPremiumTier } from "discord.js";

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
  const emoteLimit = parseEmoteLimit(guild.premium_tier);

  return {
    emoteLimit,
    level: guild.premium_tier,
  };
};
