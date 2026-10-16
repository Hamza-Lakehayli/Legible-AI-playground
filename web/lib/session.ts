import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Session helpers. Anything calling these is request-time only — keep
 * them inside Suspense on marketing pages, and call freely in protected
 * routes (dashboard is dynamic by design). connection() marks the call
 * site request-dependent BEFORE auth() runs, since Auth.js touches
 * crypto randomness that unstable-value checks would otherwise trip on
 * (instant=false does not clear those — only moving behind connection()
 * does).
 */
export async function getSession() {
  return auth();
}

/** For protected routes: redirects guests to /login instead of erroring. */
export async function requireSession() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}
