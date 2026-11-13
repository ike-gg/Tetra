import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const continuity = pgTable("continuity", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
});
