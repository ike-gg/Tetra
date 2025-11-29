// TODO: BUFFER CAN BE AN ARRAY FOR SPLIT FEATURE
import { randomUUIDv7 } from "bun";
import * as fs from "fs";
import path from "path";
import { z } from "zod";

import { MAX_SUPPORTED_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { Messages } from "@/constants/messages";
import { TIME } from "@/constants/time";
import getBufferFromUrl from "@/emotes/source/getBufferFromUrl";
import { redisClient } from "@/redis";
import { Emote, EmoteSchema } from "@/types";
import parseDiscordRegexName from "@/utils/discord/parseDiscordRegexName";

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

export class ProcessingEmoteService {
  static emoteKeyPrefix = "emote-processing";

  static getRedisKey(key: string) {
    return `${this.emoteKeyPrefix}:${key}`;
  }

  static async store(emote: Emote) {
    const emoteKey = randomUUIDv7();

    const emoteBuffer = await getBufferFromUrl(emote.file.url, {
      maxRetries: 3,
      msBetweenRetries: 1000,
      maxBufferSize: MAX_SUPPORTED_SIZE,
    });

    const tempDir = TempFileManager.create();

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
        name: parseDiscordRegexName(emote.name),
      },
    };

    const redisKey = this.getRedisKey(emoteKey);
    await redisClient.set(
      redisKey,
      JSON.stringify(payload),
      "EX",
      (TIME.MINUTE * 15) / 1000
    );

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
    await redisClient.set(
      this.getRedisKey(emoteProcessingKey),
      JSON.stringify(emoteProcessing),
      "EX",
      (TIME.MINUTE * 15) / 1000
    );
  }

  static async readBufferSafely(bufferPath: string) {
    if (!fs.existsSync(bufferPath))
      throw new EmbeddedError(
        Messages.INTERACTION_TIMEOUT_WITH_REASON("Buffer was removed due to inactivity")
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

    const tempDir = TempFileManager.create();
    const optimizedBufferPath = path.join(tempDir, "optimized");
    fs.writeFileSync(optimizedBufferPath, buffer);

    emoteProcessing.optimizedBuffer = optimizedBufferPath;

    await redisClient.set(
      this.getRedisKey(emoteProcessingKey),
      JSON.stringify(emoteProcessing),
      "EX",
      (TIME.MINUTE * 15) / 1000
    );
  }

  static async updateBuffer(emoteProcessingKey: string, buffer: Buffer) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { buffer: oldBufferPath } = emoteProcessing;

    // just to make sure the buffer exists
    await this.readBufferSafely(oldBufferPath);

    fs.writeFileSync(oldBufferPath, buffer);
  }

  static async updateSlices(
    emoteProcessingKey: string,
    slices: Buffer[],
    previewBuffer: Buffer
  ) {
    const emoteProcessing = await this.get(emoteProcessingKey);

    const tempDir = TempFileManager.create();
    const paths: string[] = [];

    await Promise.all(
      slices.map(async (slice, i) => {
        const slicePath = path.join(tempDir, `slice_${i}`);
        fs.writeFileSync(slicePath, slice);
        paths.push(slicePath);
      })
    );

    const previewBufferPath = path.join(tempDir, "preview");
    await fs.writeFileSync(previewBufferPath, previewBuffer);

    emoteProcessing.slices = {
      parts: paths,
      previewBuffer: path.join(tempDir, "preview"),
    };

    await redisClient.set(
      this.getRedisKey(emoteProcessingKey),
      JSON.stringify(emoteProcessing),
      "EX",
      (TIME.MINUTE * 15) / 1000
    );
  }

  static async deleteSlices(emoteProcessingKey: string) {
    const emoteProcessing = await this.get(emoteProcessingKey);
    const { slices } = emoteProcessing;
    if (!slices) return;
    emoteProcessing.slices = undefined;
    await redisClient.set(
      this.getRedisKey(emoteProcessingKey),
      JSON.stringify(emoteProcessing),
      "EX",
      (TIME.MINUTE * 15) / 1000
    );
  }
}
