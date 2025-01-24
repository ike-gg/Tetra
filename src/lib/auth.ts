import { betterAuth } from "better-auth/*";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: "postgresql://postgres:pwd@localhost:5432/postgres",
  }),
});
