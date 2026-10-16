import { defineConfig } from "drizzle-kit";

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
