import { Redis } from "ioredis";

import { env } from "@/env";

export const redisClient = new Redis(env.REDIS_URL);
