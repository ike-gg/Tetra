import { Collection, Guild } from "discord.js";

const findCommonGuilds = async (
  guilds: Collection<string, Guild>,
  userId: string
) => {
  return await guilds.reduce(
    //@ts-ignore
    async (acc: Guild[], guild: Guild) => {
      try {
        const userInGuild = await guild.members.fetch(userId);
        if (!userInGuild) return acc;
        const userHasPermissions = await userInGuild.permissions.has(
          "ManageEmojisAndStickers"
        );
        if (!userHasPermissions) {
          return acc;
        }
        return (await acc).concat(guild);
      } catch {
        return acc;
      }
    },
    []
  );
};

export default findCommonGuilds;
