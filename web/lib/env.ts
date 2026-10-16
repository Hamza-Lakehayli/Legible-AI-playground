import "server-only";
import { z } from "zod";

/**
 * Validated environment variables. Fails fast at startup when a required
 * variable is missing. Values are never exposed to the client unless the
 * name starts with NEXT_PUBLIC_.
 *
 * Milestones: DATABASE_URL becomes required at M2 (auth), Polar keys at
 * M6, and the runtime keeps its own .env (see ../runtime).
 */
const schema = z.object({
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")}`,
  );
}

export const env = parsed.data;

/** True once a Postgres connection string is configured. */
export function hasDatabase(): boolean {
  return Boolean(env.DATABASE_URL);
}
