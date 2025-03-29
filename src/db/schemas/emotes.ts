import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
  bigint,
  pgEnum,
  text,
} from "drizzle-orm/pg-core";

export enum EmoteOrigin {
  DISCORD = "DISCORD",
  SEVENTV = "SEVENTV",
  BTTV = "BTTV",
  FFZ = "FFZ",
  TWITCH = "TWITCH",
  CUSTOM = "CUSTOM",
}

export function enumToPgEnum<T extends Record<string, any>>(
  myEnum: T
): [T[keyof T], ...T[keyof T][]] {
  return Object.values(myEnum).map((value: any) => `${value}`) as any;
}

export const roleEnum = pgEnum("origin", enumToPgEnum(EmoteOrigin));

export const emotes = pgTable("emotes", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  isAnimated: boolean("is_animated").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  previewUrl: text("preview_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  origin: roleEnum("origin").notNull(),
});

export const removedEmotes = pgTable("removed_emotes", {
  id: serial("id").primaryKey(),
  guildId: varchar("guild_id", { length: 255 }).notNull(),
  emoteId: bigint("emote_id", { mode: "number" })
    .notNull()
    .references(() => emotes.id),
  deletedWithPanel: boolean("deleted_with_panel").notNull(),
});

export const removedEmotesRelations = relations(removedEmotes, ({ one }) => ({
  emote: one(emotes),
}));

export const emotesRelation = relations(emotes, ({ one }) => ({
  removed: one(removedEmotes, {
    fields: [emotes.id],
    references: [removedEmotes.emoteId],
  }),
}));
