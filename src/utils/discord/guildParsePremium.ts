import { Guild, GuildPremiumTier } from "discord.js";

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

export const guildParsePremium = (guild: Guild) => {
  return {
    fileLimit: parseFileLimit(guild.premiumTier),
  };
};
