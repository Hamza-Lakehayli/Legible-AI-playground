import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

/**
 * drizzle-kit runs outside Next.js, so it doesn't auto-load .env.local.
 * Load both; dotenv never overrides variables that are already set.
 */
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Drizzle Kit config for the web schema. The `web` Postgres schema is
 * created by the generated migration (drizzle-kit emits it for pgSchema).
 * The runtime service owns its own migrations in ../runtime/migrations.
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
