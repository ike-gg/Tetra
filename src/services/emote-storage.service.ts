import { randomUUIDv7 } from "bun";
import { chunk } from "lodash";

import { EmbeddedError } from "@/constants/errors";
import { TIME } from "@/constants/time";
import { redisClient } from "@/redis";
import { Emote, EmoteSchema } from "@/types";

export class EmoteStorageService {
  static emotesPerPage = 5;
  static storageKeyPrefix = "emote-storage";

  static getRedisKey(id: string) {
    return `${this.storageKeyPrefix}:${id}`;
  }

  /**
   * Store array of emotes in the database
   * @param emotes - The emotes to store
   * @returns The id of the stored emotes
   */
  static async store(emotes: Emote[]): Promise<string> {
    const emotesData = emotes.map((emote) => EmoteSchema.parse(emote));

    const storageKey = randomUUIDv7();
    const redisKey = this.getRedisKey(storageKey);

    await redisClient.set(
      redisKey,
      JSON.stringify(emotesData),
      "EX",
      (TIME.HOUR * 6) / 1000
    );

    return storageKey;
  }

  static async get(storageKey: string) {
    const redisKey = this.getRedisKey(storageKey);
    const result = await redisClient.get(redisKey);

    if (!result) return null;

    try {
      const rawEmotes = JSON.parse(result) as unknown[];
      const emotes = rawEmotes.map((emote) => EmoteSchema.parse(emote));

      const count = emotes.length;
      const pageCount = Math.ceil(count / this.emotesPerPage);

      return {
        emotes,
        pageCount,
      };
    } catch {
      return null;
    }
  }

  static async getPage(
    storageKey: string,
    page: number
  ): Promise<{ page: Emote[]; pageCount: number }> {
    const { emotes, pageCount } = (await this.get(storageKey)) ?? {};

    if (!emotes || !pageCount)
      throw new EmbeddedError({
        title: "Database Error",
        description: "Failed to get page from database, it might got expired",
      });

    const chunkedEmotes = chunk(emotes, this.emotesPerPage);

    return { page: chunkedEmotes[page - 1], pageCount };
  }
}
