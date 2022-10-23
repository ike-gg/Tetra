import { Guild } from "discord.js";

const isEmoteFromThisGuild = async (
  guild: Guild,
  emoteId: string
): Promise<boolean> => {
  return await guild.emojis
    .fetch(emoteId)
    .then(() => true)
    .catch(() => false);
};

export default isEmoteFromThisGuild;
