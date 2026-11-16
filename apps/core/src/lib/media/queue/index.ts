import { redisClient } from "@/redis";

import { MediaQueue } from "./media-queue";

export * from "./media-queue";

export const mediaQueue = new MediaQueue(redisClient, () => redisClient.duplicate());
