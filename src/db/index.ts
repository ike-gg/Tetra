import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "@/env";

import * as schema from "./schema";

export const db = drizzle(env.POSTGRES_URL, { schema });
