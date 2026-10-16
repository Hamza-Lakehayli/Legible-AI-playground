/**
 * Cache tag design — see spec ADR 7. Every cached query declares its tags
 * here so invalidation sites and the caching strategy stay reviewable.
 */
export const cacheTags = {
  /** All offerings (home page, offerings index). */
  offerings: "offerings",
  /** A single offering page. */
  offering: (slug: string) => `offering:${slug}`,
} as const;
