import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { env } from "@/env";

// Resolved from this file, so it is apps/core/drizzle both locally and in the image
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/** Applies pending migrations from `drizzle/`. Run once, in the manager, before anything else. */
export const runMigrations = async () => {
  // Own single connection, closed afterwards, so it doesn't outlive startup
  const pool = new Pool({ connectionString: env.POSTGRES_URL, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
};
