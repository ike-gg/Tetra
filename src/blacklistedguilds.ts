interface BlacklistedGuild {
  guildId: string;
  startDate?: Date;
}

class BlacklistedGuild {
  constructor(guildId: string, startDate?: Date) {
    this.guildId = guildId;
    this.startDate = startDate;
  }

  get isActive() {
    if (this.startDate) {
      const now = new Date();
      return now > this.startDate;
    }
    return true;
  }
}

export const BLACKLISTED_GUILDS: BlacklistedGuild[] = [
  new BlacklistedGuild("529630064191602720", new Date(1717497480000)),
];
