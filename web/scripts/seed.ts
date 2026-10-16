import "dotenv/config";
import { Pool } from "pg";
import { offerings } from "../lib/content/offerings";

/**
 * Seed web.offerings from lib/content. Run after migrations:
 *   pnpm db:migrate && pnpm db:seed
 *
 * Idempotent: upserts on slug. Offerings edited later go through
 * lib/data write functions (with updateTag) once an admin surface
 * exists — this script is for bootstrap and content refreshes.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Add it to web/.env.local first.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS "web"');

    for (const o of offerings) {
      await pool.query(
        `INSERT INTO web.offerings (slug, kind, title, summary, content, published)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE
           SET kind = EXCLUDED.kind,
               title = EXCLUDED.title,
               summary = EXCLUDED.summary,
               content = EXCLUDED.content,
               published = true,
               updated_at = now()`,
        [o.slug, o.kind, o.title, o.summary, JSON.stringify(o)],
      );
      console.log(`seeded offering: ${o.slug}`);
    }

    console.log(`done — ${offerings.length} offerings upserted.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
