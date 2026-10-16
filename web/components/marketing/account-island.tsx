import { Suspense } from "react";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";

/**
 * Account area — the dynamic island in the header. It renders only for a
 * real user request: `connection()` defers it out of the prerendered
 * shell (auth() touches crypto randomness that would otherwise trip the
 * prerender pass), and the Suspense fallback ships instead.
 */
async function AccountArea() {
  await connection();
  const session = await auth();

  if (session?.user?.id) {
    return (
      <>
        <span className="hidden max-w-40 truncate text-sm text-muted lg:inline">
          {session.user.email}
        </span>
        <ButtonLink href="/dashboard" size="sm">
          Dashboard
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <ButtonLink href="/login" variant="ghost" size="sm">
        Log in
      </ButtonLink>
      <ButtonLink href="/playground" size="sm">
        Open playground
      </ButtonLink>
    </>
  );
}

export function AccountIsland() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2" aria-hidden>
          <div className="h-8 w-14 animate-pulse rounded bg-surface-muted" />
          <div className="h-8 w-28 animate-pulse rounded bg-surface-muted" />
        </div>
      }
    >
      <AccountArea />
    </Suspense>
  );
}
