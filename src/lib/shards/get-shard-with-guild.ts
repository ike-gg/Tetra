import { shardingManager } from "@/index";

export const getShardWithGuild = async (guildId: string) => {
  const shardsId = await shardingManager.broadcastEval(
    (client, { guildId }) => {
      if (client.guilds.cache.has(guildId)) {
        return client.shard?.ids;
      } else {
        return false;
      }
    },
    { context: { guildId } }
  );

  const shardId = shardsId.flat().find((id) => id !== false);

  if (typeof shardId !== "number") return null;

  return shardingManager.shards.get(shardId);
};
