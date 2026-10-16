import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { offerings as offeringsTable } from "@/lib/db/schema";
import { cacheTags } from "@/lib/cache-tags";
import { offerings as seedOfferings } from "@/lib/content/offerings";
import type { Offering } from "@/lib/content/offerings";

export type { Offering, OfferingPreview, HowItWorksStep } from "@/lib/content/offerings";

/**
 * Server-only data layer for offerings (spec principle 1: Server
 * Components read data through this module, never through API calls).
 *
 * Reads from Postgres when DATABASE_URL is configured and the table has
 * rows; falls back to the seed content module otherwise, so the site
 * renders before the database exists (M0). Invalidation flows through
 * the tags in lib/cache-tags — future admin writes call updateTag.
 */

let warnedFallback = false;

function fallback(): Offering[] {
  if (!warnedFallback) {
    console.warn(
      "[lib/data] No DATABASE_URL or empty offerings table — serving seed content from lib/content. Run `pnpm db:migrate && pnpm db:seed` after configuring Postgres.",
    );
    warnedFallback = true;
  }
  return seedOfferings;
}

export async function getOfferings(): Promise<Offering[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.offerings);

  const db = getDb();
  if (!db) return fallback();

  try {
    const rows = await db
      .select()
      .from(offeringsTable)
      .where(eq(offeringsTable.published, true))
      .orderBy(asc(offeringsTable.id));

    if (rows.length === 0) return fallback();

    return rows.map((row) => ({
      ...(row.content as Omit<Offering, "slug" | "kind" | "title" | "summary" | "order">),
      slug: row.slug,
      kind: row.kind as Offering["kind"],
      title: row.title,
      summary: row.summary,
      order: (row.content as { order?: number }).order ?? 99,
    }));
  } catch (error) {
    console.error("[lib/data] offerings query failed, using seed content:", error);
    return fallback();
  }
}

export async function getOffering(slug: string): Promise<Offering | null> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.offering(slug));

  const all = await getOfferings();
  return all.find((o) => o.slug === slug) ?? null;
}
