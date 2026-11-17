import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";

import { MAX_SUPPORTED_SIZE } from "@/constants";
import { EmoteTooLargeError, UnsupportedEmoteFileError } from "@/constants/errors";
import { TIME } from "@/constants/time";
import { db } from "@/db";
import { stvSyncLinks, stvSyncReview } from "@/db/schema";
import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";
import { normalizeEmoteBuffer } from "@/lib/buffer/normalize-emote-buffer";
import { optimizeBuffer } from "@/lib/buffer/optimize-buffer";
import { discordRestApi } from "@/lib/discord-rest-api";
import { assertAllowedEmoteSourceUrl } from "@/lib/network/url-guard";
import { getEmojiSlotLimit } from "@/utils/discord/guild-parse-premium";
import parseDiscordRegexName from "@/utils/discord/parse-discord-regex-name";
import { createErrorCode, logErrorCode } from "@/utils/error-code";

import { Semaphore } from "./job-queue";
import { type ReviewDetail, type ReviewReason, upsertReviewEntry } from "./review";
import { findMatchingRule, type RuleEventFacts, type RuleFacts } from "./rules";
import type { SyncSettings } from "./settings";
import { getStvUsername } from "./stv-user";
import type { SyncEmoteSource } from "./sync-emote";

import { StvSyncConsole } from "#/loggers";

const DOWNLOAD_TIMEOUT = 15_000;
const PREPARED_TTL = 10 * TIME.MINUTE;
const PREPARED_MAX = 50;

export type AddOutcome =
  | { status: "added"; emoji: { id: string; name: string; animated: boolean } }
  | { status: "review"; reason: ReviewReason; detail: ReviewDetail }
  | { status: "skipped"; why: "linked" | "rule" };

interface PreparedSource {
  buffer: Buffer;
  animated: boolean;
  width: number;
  height: number;
  /** The downloaded file, before normalizing. */
  sizeBytes: number;
  frames: number;
  durationMs: number;
}

class ReviewOutcome extends Error {
  constructor(
    readonly reason: ReviewReason,
    readonly detail: ReviewDetail
  ) {
    super(`${reason}${detail ? ` (${detail})` : ""}`);
  }
}

// Several servers syncing one channel get the same emote at once: download and optimize
// it once. Promises are cached, so concurrent jobs share the work.
const sourceCache = new Map<string, { at: number; value: Promise<PreparedSource> }>();
const optimizedCache = new Map<string, { at: number; value: Promise<Buffer> }>();
const heavyWork = new Semaphore(2);

const cachedPromise = <T>(
  cache: Map<string, { at: number; value: Promise<T> }>,
  key: string,
  create: () => Promise<T>
) => {
  const now = Date.now();
  for (const [cachedKey, entry] of cache) {
    if (now - entry.at > PREPARED_TTL) cache.delete(cachedKey);
  }
  const hit = cache.get(key);
  if (hit) return hit.value;

  if (cache.size >= PREPARED_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  const value = create();
  cache.set(key, { at: now, value });
  // Failures aren't cached: a retry must download again
  value.catch(() => cache.delete(key));
  return value;
};

const loadSource = (fileUrl: string) =>
  cachedPromise(sourceCache, fileUrl, () =>
    heavyWork.run(async () => {
      let buffer: Buffer;
      try {
        await assertAllowedEmoteSourceUrl(fileUrl);
        buffer = await getBufferFromUrl(fileUrl, {
          maxBufferSize: MAX_SUPPORTED_SIZE,
          maxRetries: 2,
          timeoutMs: DOWNLOAD_TIMEOUT,
        });
      } catch (error) {
        StvSyncConsole.warn(
          `download of ${fileUrl} failed:`,
          error instanceof Error ? error.message : String(error)
        );
        throw new ReviewOutcome("FAILED", "download");
      }

      try {
        const normalized = await normalizeEmoteBuffer(buffer);
        const metadata = await sharp(normalized.buffer, { animated: true }).metadata();
        const frames = normalized.animated ? (metadata.pages ?? 1) : 1;
        return {
          buffer: normalized.buffer,
          animated: normalized.animated,
          width: metadata.width ?? 1,
          // `height` of an animated image is all frames stacked
          height: metadata.pageHeight ?? metadata.height ?? 1,
          sizeBytes: buffer.byteLength,
          frames,
          durationMs: normalized.animated
            ? (metadata.delay ?? [])
                .slice(0, frames)
                .reduce((sum, delay) => sum + delay, 0)
            : 0,
        };
      } catch (error) {
        if (error instanceof UnsupportedEmoteFileError) {
          throw new ReviewOutcome("FAILED", "invalid_file");
        }
        throw error;
      }
    })
  );

/** Always `contain`: the whole emote stays visible. */
const optimizeSource = (fileUrl: string, source: PreparedSource) =>
  cachedPromise(optimizedCache, fileUrl, () =>
    heavyWork.run(async () => {
      try {
        const { buffer } = await optimizeBuffer(source.buffer, { fitting: "contain" });
        return buffer;
      } catch (error) {
        if (error instanceof EmoteTooLargeError)
          throw new ReviewOutcome("TOO_LARGE", null);
        if (error instanceof UnsupportedEmoteFileError) {
          throw new ReviewOutcome("FAILED", "invalid_file");
        }
        throw error;
      }
    })
  );

type RestGuild = Awaited<ReturnType<typeof discordRestApi.guilds.get>>;

/** Free slots of the emote's type, from Discord (not the shard cache). */
const freeSlots = (guild: RestGuild, animated: boolean) => {
  const limit = getEmojiSlotLimit(guild.premium_tier, guild.features);
  // Managed emojis (Twitch integration) don't take slots
  const used = guild.emojis.filter(
    (emoji) => !emoji.managed && !!emoji.animated === animated
  ).length;
  return Math.max(0, limit - used);
};

/** Case-insensitive: `Pog` next to `pog` is the confusion the default rule avoids. */
const isNameTaken = (guild: RestGuild, name: string) => {
  const lower = name.toLowerCase();
  return guild.emojis.some((emoji) => emoji.name?.toLowerCase() === lower);
};

const memo = <T>(load: () => Promise<T>) => {
  let value: Promise<T> | undefined;
  return () => {
    value ??= load();
    return value;
  };
};

/** Maps Discord's refusal of an emoji create to a review reason; null = unexpected. */
const reviewOutcomeForDiscordError = (error: unknown): ReviewOutcome | null => {
  if (!(error instanceof DiscordAPIError)) return null;
  switch (error.code) {
    case RESTJSONErrorCodes.MaximumNumberOfEmojisReached:
    case RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached:
      return new ReviewOutcome("NO_SLOT", null);
    case RESTJSONErrorCodes.FailedToResizeAssetBelowTheMaximumSize:
    case RESTJSONErrorCodes.FileUploadedExceedsMaximumSize:
      return new ReviewOutcome("TOO_LARGE", null);
    case RESTJSONErrorCodes.MissingPermissions:
    case RESTJSONErrorCodes.MissingAccess:
      return new ReviewOutcome("FAILED", "permissions");
    case RESTJSONErrorCodes.InvalidFileUploaded:
      return new ReviewOutcome("FAILED", "invalid_file");
    default:
      return new ReviewOutcome("FAILED", "discord");
  }
};

const toReviewOutcome = (error: unknown, tag: string): ReviewOutcome => {
  if (error instanceof ReviewOutcome) return error;

  const discordOutcome = reviewOutcomeForDiscordError(error);
  if (discordOutcome) {
    StvSyncConsole.warn(
      `${tag} Discord refused it:`,
      error instanceof Error ? error.message : String(error)
    );
    return discordOutcome;
  }

  const code = createErrorCode();
  logErrorCode(code, `${tag} sync add failed:`, error);
  return new ReviewOutcome("FAILED", `unknown:${code}`);
};

/** Stores the link of a created emoji and drops the emote's review entry. */
export const linkSyncedEmoji = async (
  guildId: string,
  stvEmoteId: string,
  emoji: { id: string; name: string; animated: boolean }
) => {
  await db.transaction(async (tx) => {
    await tx
      .insert(stvSyncLinks)
      .values({
        guildId,
        stvEmoteId,
        discordEmojiId: emoji.id,
        name: emoji.name,
        animated: emoji.animated,
      })
      .onConflictDoUpdate({
        target: [stvSyncLinks.guildId, stvSyncLinks.stvEmoteId],
        set: {
          discordEmojiId: emoji.id,
          name: emoji.name,
          animated: emoji.animated,
          createdAt: new Date(),
        },
      });
    await tx
      .delete(stvSyncReview)
      .where(
        and(eq(stvSyncReview.guildId, guildId), eq(stvSyncReview.stvEmoteId, stvEmoteId))
      );
  });
};

/**
 * Adds one 7TV emote to a guild, or puts it in review with the reason. Basic filters are
 * the caller's job. `rules` = the event's facts, so the advanced rules run; a retry passes
 * none (the admin picked the emote). Run it through `runForGuild`, so slot counts stay
 * correct.
 */
export const addSyncedEmote = async (
  guildId: string,
  emote: SyncEmoteSource,
  settings: SyncSettings,
  rules?: RuleEventFacts
): Promise<AddOutcome> => {
  const tag = `[guild ${guildId}] ${emote.name} (${emote.stvEmoteId})`;

  const existing = await db.query.stvSyncLinks.findFirst({
    where: and(
      eq(stvSyncLinks.guildId, guildId),
      eq(stvSyncLinks.stvEmoteId, emote.stvEmoteId)
    ),
  });
  if (existing) {
    StvSyncConsole.info(
      `${tag} already linked to emoji ${existing.discordEmojiId}, skipped`
    );
    return { status: "skipped", why: "linked" };
  }

  let source: PreparedSource | undefined;
  const file = memo(async () => {
    source = await loadSource(emote.fileUrl);
    return source;
  });
  // Read once per job: jobs of a guild run serially, so nothing changes in between
  const guild = memo(() => discordRestApi.guilds.get(guildId));
  const name = parseDiscordRegexName(emote.name);

  try {
    if (rules) {
      const facts: RuleFacts = {
        event: rules,
        file,
        server: async () => {
          const [prepared, rest] = await Promise.all([file(), guild()]);
          return {
            freeSlots: freeSlots(rest, prepared.animated),
            nameTaken: isNameTaken(rest, name),
          };
        },
        actorUsername: () =>
          rules.actorId ? getStvUsername(rules.actorId) : Promise.resolve(null),
      };
      const match = await findMatchingRule(settings.advancedRules, facts);
      if (match?.rule.action === "skip") {
        StvSyncConsole.info(`${tag} skipped by rule ${match.position}`);
        return { status: "skipped", why: "rule" };
      }
      if (match?.rule.action === "review") {
        throw new ReviewOutcome("RULE", String(match.position));
      }
      if (match) StvSyncConsole.info(`${tag} added by rule ${match.position}`);
    }

    const prepared = await file();

    const ratio =
      Math.max(prepared.width, prepared.height) /
      Math.max(1, Math.min(prepared.width, prepared.height));
    if (ratio > settings.optimization.maxAspectRatio) {
      throw new ReviewOutcome("ASPECT_RATIO", ratio.toFixed(2));
    }

    if (freeSlots(await guild(), prepared.animated) === 0) {
      throw new ReviewOutcome("NO_SLOT", prepared.animated ? "animated" : "static");
    }

    const buffer = await optimizeSource(emote.fileUrl, prepared);
    const metadata = await sharp(buffer).metadata();

    StvSyncConsole.info(`${tag} creating emoji ${name} (${buffer.byteLength} bytes)`);

    const created = await discordRestApi.guilds.createEmoji(guildId, {
      name,
      image: `data:image/${metadata.format};base64,${buffer.toString("base64")}`,
    });

    const emoji = {
      id: created.id ?? "",
      name: created.name ?? name,
      animated: created.animated ?? prepared.animated,
    };
    await linkSyncedEmoji(guildId, emote.stvEmoteId, emoji);
    StvSyncConsole.success(`${tag} added as emoji ${emoji.id}`);
    return { status: "added", emoji };
  } catch (error) {
    const outcome = toReviewOutcome(error, tag);
    const prepared = source as PreparedSource | undefined;

    await upsertReviewEntry(guildId, emote, outcome.reason, outcome.detail, {
      animated: prepared?.animated,
      width: prepared?.width,
      height: prepared?.height,
    });
    StvSyncConsole.warn(`${tag} needs review: ${outcome.message}`);
    return { status: "review", reason: outcome.reason, detail: outcome.detail };
  }
};

/** Puts an emote a basic filter rejected in review, without downloading it. */
export const reviewFilteredEmote = async (
  guildId: string,
  emote: SyncEmoteSource,
  filter: string
) => {
  await upsertReviewEntry(guildId, emote, "FILTERED", filter);
  StvSyncConsole.info(
    `[guild ${guildId}] ${emote.name} (${emote.stvEmoteId}) filtered (${filter}), needs review`
  );
};
