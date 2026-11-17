import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import type { SyncSettings } from "@/stv-sync/settings";

/** One linked Twitch channel per guild (see docs/core/7tv-sync.md). */
export const stvSyncConfigs = pgTable("stv_sync_configs", {
  guildId: varchar("guild_id", { length: 255 }).primaryKey(),
  twitchId: varchar("twitch_id", { length: 32 }).notNull(),
  twitchLogin: varchar("twitch_login", { length: 64 }).notNull(),
  twitchDisplayName: varchar("twitch_display_name", { length: 64 }).notNull(),
  stvUserId: varchar("stv_user_id", { length: 32 }).notNull(),
  // Null while the 7TV user has no active set
  emoteSetId: varchar("emote_set_id", { length: 32 }),
  enabled: boolean("enabled").notNull().default(true),
  settings: jsonb("settings").$type<SyncSettings>().notNull(),
  linkedBy: varchar("linked_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** A Discord emoji tetra created from a 7TV emote; only these are removed by sync. */
export const stvSyncLinks = pgTable(
  "stv_sync_links",
  {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id", { length: 255 }).notNull(),
    stvEmoteId: varchar("stv_emote_id", { length: 32 }).notNull(),
    discordEmojiId: varchar("discord_emoji_id", { length: 32 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    animated: boolean("animated").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stv_sync_links_guild_emote_idx").on(table.guildId, table.stvEmoteId),
    index("stv_sync_links_emoji_idx").on(table.discordEmojiId),
  ]
);

/** 7TV emotes that need review (not added), with the reason. One entry per guild and emote. */
export const stvSyncReview = pgTable(
  "stv_sync_review",
  {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id", { length: 255 }).notNull(),
    stvEmoteId: varchar("stv_emote_id", { length: 32 }).notNull(),
    // The alias in the streamer's set, not sanitized for Discord
    name: varchar("name", { length: 128 }).notNull(),
    animated: boolean("animated").notNull(),
    fileUrl: text("file_url").notNull(),
    previewUrl: text("preview_url").notNull(),
    // Of the source file, when known (from 7TV's file list or the downloaded file)
    width: integer("width"),
    height: integer("height"),
    author: varchar("author", { length: 64 }),
    reason: varchar("reason", { length: 32 }).notNull(),
    detail: varchar("detail", { length: 64 }),
    flaggedAt: timestamp("flagged_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stv_sync_review_guild_emote_idx").on(table.guildId, table.stvEmoteId),
  ]
);

/**
 * What the sync did, per guild, for the panel's activity log. Trimmed on insert to the
 * newest 200 per guild and 30 days (docs/core/7tv-sync.md#activity-log).
 */
export const stvSyncLog = pgTable(
  "stv_sync_log",
  {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id", { length: 255 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    // Null for channel actions (linked, paused, set switched…)
    stvEmoteId: varchar("stv_emote_id", { length: 32 }),
    // The alias at the time; the Twitch login for `linked`
    name: varchar("name", { length: 128 }),
    animated: boolean("animated"),
    discordEmojiId: varchar("discord_emoji_id", { length: 32 }),
    // Per action, see `SyncLogInput`
    reason: varchar("reason", { length: 32 }),
    detail: varchar("detail", { length: 128 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Pages and trims go by id (serial, so insert order = time order)
  (table) => [index("stv_sync_log_guild_id_idx").on(table.guildId, table.id.desc())]
);
