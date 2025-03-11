import { ShardingManager } from "discord.js";
import { env } from "./env";

const manager = new ShardingManager("./src/bot.ts", { token: env.discordBotToken });

manager.on("shardCreate", (shard) => console.log(`Launched shard ${shard.id}`));

manager.spawn();
