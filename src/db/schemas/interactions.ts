import { bigint, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const interactions = pgTable("interactions", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  command: varchar("command", { length: 256 }).notNull(),
  input: jsonb("input"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: varchar("user_id", { length: 256 }).notNull(),
  guildId: varchar("guild_id", { length: 256 }),
});
