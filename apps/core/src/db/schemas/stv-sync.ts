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

/** 7TV emotes the sync couldn't add, with the reason. One entry per guild and emote. */
export const stvSyncQueue = pgTable(
  "stv_sync_queue",
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
    queuedAt: timestamp("queued_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stv_sync_queue_guild_emote_idx").on(table.guildId, table.stvEmoteId),
  ]
);
