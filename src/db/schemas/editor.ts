import { relations } from "drizzle-orm";
import { bigint, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { emotes } from "./emotes";

export const editorTasks = pgTable("editor_tasks", {
  id: varchar("id")
    .primaryKey()
    .$defaultFn(() => nanoid(12)),
  guildId: varchar("guild_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  emoteId: bigint("emote_id", { mode: "number" })
    .notNull()
    .references(() => emotes.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Kept for editing the bot's message on submit (not decided yet, see API contract)
  channelId: varchar("channel_id", { length: 255 }),
  messageId: varchar("message_id", { length: 255 }),
});

export const editorTasksRelations = relations(editorTasks, ({ one }) => ({
  emote: one(emotes, {
    fields: [editorTasks.emoteId],
    references: [emotes.id],
  }),
}));
