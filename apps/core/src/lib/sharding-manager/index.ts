import path from "node:path";
import { ShardingManager } from "discord.js";

import { env } from "@/env";

// Manager process only. Never import `@/bot` here or from API code: it would create and
// log in a second client.
export const shardingManager = new ShardingManager(
  path.join(import.meta.dir, "../../bot.ts"),
  {
    token: env.DISCORD_BOT_TOKEN,
    totalShards: "auto",
  }
);
