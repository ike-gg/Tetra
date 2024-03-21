import { Guild, GuildPremiumTier } from "discord.js";
import { parse } from "node:path";

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
  return {
    fileLimit: parseFileLimit(guild.premiumTier),
    emoteLimit: parseEmoteLimit(guild.premiumTier),
    level: guild.premiumTier,
  };
};
