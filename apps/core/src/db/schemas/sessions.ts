import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { users } from "./users";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  session_token: varchar("session_token", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  // Sliding session expiry is measured from this (see API session constants)
  last_used_at: timestamp("last_used_at").notNull().defaultNow(),
});
