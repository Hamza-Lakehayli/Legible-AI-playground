import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env, hasDatabase } from "@/lib/env";
import * as schema from "./schema";

/**
 * Lazy Drizzle client. The pool is only created when a DATABASE_URL is
 * configured, so the site builds and renders from seed content before
 * Postgres exists (M0). Never import this from a Client Component.
 */
let pool: Pool | null = null;

export function getDb() {
  if (!hasDatabase()) return null;
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 });
  }
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof getDb>;
