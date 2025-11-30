import { pgTable, serial, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discord_id: varchar("discord_id", { length: 255 }).notNull().unique(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token").notNull(),
  token_expires_at: timestamp("token_expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});
