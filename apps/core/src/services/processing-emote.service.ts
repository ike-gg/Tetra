import * as fs from "node:fs";
import path from "node:path";
import { randomUUIDv7 } from "bun";
import { z } from "zod";

import { MAX_SUPPORTED_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { Messages } from "@/constants/messages";
import { TIME } from "@/constants/time";
import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";
import { normalizeEmoteBuffer } from "@/lib/buffer/normalize-emote-buffer";
import { redisClient } from "@/redis";
import { type Emote, EmoteSchema } from "@/types";
import parseDiscordRegexName from "@/utils/discord/parse-discord-regex-name";

import { TempFileManager } from "#/files/temp-file-manager";

const ProcessingEmoteSchema = z.object({
  key: z.string(),
  originalBuffer: z.string(),
  buffer: z.string(),
  optimizedBuffer: z.string().optional(),
  slices: z
    .object({
      parts: z.array(z.string()),
      previewBuffer: z.string(),
    })
    .optional(),
  emote: EmoteSchema,
  customName: z.string().optional(),
});

type ProcessingEmote = z.infer<typeof ProcessingEmoteSchema>;

// The state expires this long after its last write; its files live exactly as long.
const STATE_TTL_SECONDS = (TIME.MINUTE * 15) / 1000;

export class ProcessingEmoteService {
  static emoteKeyPrefix = "emote-processing";

  static getRedisKey(key: string) {
    return `${this.emoteKeyPrefix}:${key}`;
  }

  private static async persist(key: string, state: ProcessingEmote) {
    await redisClient.set(
      this.getRedisKey(key),
      JSON.stringify(state),
      "EX",
      STATE_TTL_SECONDS
    );
  }

  /** Each shard is a separate process, so liveness is checked in Redis, not in memory. */
  private static startFileSweeper() {
    TempFileManager.startSweeper(
      async (key) => (await redisClient.exists(this.getRedisKey(key))) === 1
    );
  }

  static async store(emote: Emote) {
    this.startFileSweeper();

    const emoteKey = randomUUIDv7();

    const downloadedBuffer = await getBufferFromUrl(emote.file.url, {
      maxRetries: 3,
      msBetweenRetries: 1000,
      maxBufferSize: MAX_SUPPORTED_SIZE,
    });

    const { buffer: emoteBuffer, animated } =
      await normalizeEmoteBuffer(downloadedBuffer);

    const tempDir = TempFileManager.createPersistent(emoteKey);

    const originalBuffer = path.join(tempDir, "original");
    const buffer = path.join(tempDir, "buffer");

    fs.writeFileSync(originalBuffer, emoteBuffer);
    fs.writeFileSync(buffer, emoteBuffer);

    const payload: ProcessingEmote = {
      key: emoteKey,
      originalBuffer,
      buffer,
      emote: {
        ...emote,
        animated,
        name: parseDiscordRegexName(emote.name),
      },
    };

    await this.persist(emoteKey, payload);

    return emoteKey;
  }

  static async get(emoteProcessingKey: string): Promise<ProcessingEmote> {
    const redisKey = this.getRedisKey(emoteProcessingKey);
    const result = await redisClient.get(redisKey);

    if (!result) throw new EmbeddedError(Messages.INTERACTION_TIMEOUT);

    const emoteProcessing = ProcessingEmoteSchema.parse(JSON.parse(result));

    return emoteProcessing;
  }

  static async setCustomName(emoteProcessingKey: string, customName: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    emoteProcessing.customName = customName;
    await this.persist(emoteProcessingKey, emoteProcessing);
  }

  static async readBufferSafely(bufferPath: string) {
    if (!fs.existsSync(bufferPath))
      throw new EmbeddedError(
        Messages.INTERACTION_TIMEOUT_WITH_REASON(
          "the emote was cleared after 15 min without activity"
        )
      );

    return fs.readFileSync(bufferPath);
  }

  static async getEmote(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { emote } = emoteProcessing;
    return emote;
  }

  static async getBuffer(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { buffer } = emoteProcessing;

    return this.readBufferSafely(buffer);
  }

  static async getSlices(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { parts } = emoteProcessing.slices ?? {};
    if (!parts) return [];
    return await Promise.all(parts.map((slice) => this.readBufferSafely(slice)));
  }

  static async getSlicesPreviewBuffer(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { previewBuffer } = emoteProcessing.slices ?? {};
    if (!previewBuffer) return null;
    return this.readBufferSafely(previewBuffer);
  }

  static async getOriginalBuffer(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { originalBuffer } = emoteProcessing;
    return this.readBufferSafely(originalBuffer);
  }

  static async getOptimizedBuffer(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { optimizedBuffer } = emoteProcessing;
    if (!optimizedBuffer) return null;
    return this.readBufferSafely(optimizedBuffer);
  }

  static async updateOptimizedBuffer(emoteProcessingKey: string, buffer: Buffer) {
    const emoteProcessing = await this.get(emoteProcessingKey);

    const tempDir = TempFileManager.createPersistent(emoteProcessingKey);
    const optimizedBufferPath = path.join(tempDir, "optimized");
    fs.writeFileSync(optimizedBufferPath, buffer);

    emoteProcessing.optimizedBuffer = optimizedBufferPath;

    await this.persist(emoteProcessingKey, emoteProcessing);
  }

  static async updateBuffer(emoteProcessingKey: string, buffer: Buffer) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { buffer: oldBufferPath } = emoteProcessing;

    // just to make sure the buffer exists
    await this.readBufferSafely(oldBufferPath);

    fs.writeFileSync(oldBufferPath, buffer);

    // A changed buffer is a write like the others, so the state expires 15 min after it.
    await redisClient.expire(this.getRedisKey(emoteProcessingKey), STATE_TTL_SECONDS);
  }

  static async updateSlices(
    emoteProcessingKey: string,
    slices: Buffer[],
    previewBuffer: Buffer
  ) {
    const emoteProcessing = await this.get(emoteProcessingKey);

    // Replacing slices must not leave stale `slice_N` files in the shared dir
    const slicesDir = path.join(
      TempFileManager.createPersistent(emoteProcessingKey),
      "slices"
    );
    fs.rmSync(slicesDir, { recursive: true, force: true });
    fs.mkdirSync(slicesDir);

    const paths: string[] = [];

    await Promise.all(
      slices.map(async (slice, i) => {
        const slicePath = path.join(slicesDir, `slice_${i}`);
        fs.writeFileSync(slicePath, slice);
        paths.push(slicePath);
      })
    );

    const previewBufferPath = path.join(slicesDir, "preview");
    await fs.writeFileSync(previewBufferPath, previewBuffer);

    emoteProcessing.slices = {
      parts: paths,
      previewBuffer: previewBufferPath,
    };

    await this.persist(emoteProcessingKey, emoteProcessing);
  }

  static async deleteSlices(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { slices } = emoteProcessing;
    if (!slices) return;
    emoteProcessing.slices = undefined;
    await this.persist(emoteProcessingKey, emoteProcessing);
  }
}
