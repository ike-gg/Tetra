import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stvSyncConfigs, stvSyncLinks, stvSyncReview } from "@/db/schema";
import { env } from "@/env";
import {
  getReviewEntry,
  type ReviewReason,
  type ReviewRow,
  reviewMessage,
} from "@/stv-sync/review";
import {
  DEFAULT_SYNC_SETTINGS,
  readStoredSettings,
  type SyncSettings,
} from "@/stv-sync/settings";
import { stvSync } from "@/stv-sync/sync-service";
import parseDiscordRegexName from "@/utils/discord/parse-discord-regex-name";

import { TetraAPIError } from "../../tetra-api-error";
import { guildParamsSchema } from "../guilds/guilds.shared";

export const reviewEntryParamsSchema = guildParamsSchema.extend({
  entryId: z
    .string()
    .regex(/^\d{1,10}$/)
    .transform(Number),
});

export const getSyncConfig = (guildId: string) =>
  db.query.stvSyncConfigs.findFirst({ where: eq(stvSyncConfigs.guildId, guildId) });

export type SyncConfigRow = NonNullable<Awaited<ReturnType<typeof getSyncConfig>>>;

export const requireSyncConfig = async (guildId: string) => {
  const config = await getSyncConfig(guildId);
  if (!config) {
    throw new TetraAPIError(
      404,
      "this server doesn't sync a 7TV channel yet",
      "SYNC_NOT_LINKED"
    );
  }
  return config;
};

const countRows = async (
  table: typeof stvSyncLinks | typeof stvSyncReview,
  guildId: string
) => {
  const [row] = await db
    .select({ value: count() })
    .from(table)
    .where(eq(table.guildId, guildId));
  return row?.value ?? 0;
};

/** The panel's view of a review entry. */
export const serializeReviewEntry = (row: ReviewRow, settings: SyncSettings) => ({
  id: row.id,
  stvEmoteId: row.stvEmoteId,
  /** The alias in the streamer's set. */
  name: row.name,
  /** The name the emote gets on Discord. */
  discordName: parseDiscordRegexName(row.name),
  animated: row.animated,
  previewUrl: row.previewUrl,
  /** The source file (7TV CDN, CORS `*`), for the editor. */
  fileUrl: row.fileUrl,
  width: row.width,
  height: row.height,
  author: row.author,
  reason: row.reason as ReviewReason,
  detail: row.detail,
  message: reviewMessage(row, settings),
  flaggedAt: row.flaggedAt.toISOString(),
});

/** The sync state of one guild, as every sync route except the review routes answers it. */
export const buildSyncState = async (guildId: string) => {
  const config = await getSyncConfig(guildId);
  const connection = stvSync.status(config?.enabled ? config.emoteSetId : null);

  if (!config) {
    return {
      available: env.SEVENTV_SYNC_ENABLED,
      connection,
      sync: null,
      defaults: DEFAULT_SYNC_SETTINGS,
    };
  }

  const [linkedEmotes, reviewEmotes] = await Promise.all([
    countRows(stvSyncLinks, guildId),
    countRows(stvSyncReview, guildId),
  ]);

  return {
    available: env.SEVENTV_SYNC_ENABLED,
    connection,
    sync: {
      channel: {
        twitchId: config.twitchId,
        login: config.twitchLogin,
        displayName: config.twitchDisplayName,
        stvUserId: config.stvUserId,
        emoteSetId: config.emoteSetId,
      },
      enabled: config.enabled,
      settings: readStoredSettings(config.settings),
      linkedEmotes,
      reviewEmotes,
      linkedAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    },
    defaults: DEFAULT_SYNC_SETTINGS,
  };
};

/** A review entry by id, only if it belongs to the guild in the URL. */
export const requireReviewEntry = async (guildId: string, entryId: number) => {
  const entry = await getReviewEntry(guildId, entryId);
  if (!entry) {
    throw new TetraAPIError(
      404,
      "this emote isn't in review anymore",
      "REVIEW_ENTRY_NOT_FOUND"
    );
  }
  return entry;
};
