import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getWorkspaceForUser } from "@/lib/data/workspace";
import { getEntitlements } from "@/lib/entitlements";
import { signOutAction } from "@/actions/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Badge } from "@/components/ui/badge";
import { site } from "@/lib/site";

/**
 * Protected shell (M2). Auth-gated routes are blocking by declaration:
 * no static shell leaks to guests, and guests get a real redirect.
 */
export const instant = false;
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const workspace = session.user.workspaceId
    ? await getWorkspaceForUser(session.user.id)
    : null;

  if (!workspace) redirect("/login");

  const entitlements = await getEntitlements(workspace.id);

  return (
    <div className="flex min-h-screen flex-col bg-page">
      {/* Top bar */}
      <header className="border-b border-line bg-surface">
        <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-baseline gap-4">
            <a
              href="/"
              className="flex items-baseline gap-1"
              aria-label={`${site.name} — back to site`}
            >
              <span className="font-semibold tracking-tight">{site.name}</span>
              <span className="font-mono text-xs text-accent">/ai</span>
            </a>
            <span className="hidden text-sm text-muted sm:inline">
              {workspace.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="accent">
              {entitlements.plan} · {entitlements.runsPerDay} runs/day
            </Badge>
            <span className="hidden text-sm text-muted md:inline">
              {session.user.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-control border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* App rail */}
        <aside className="border-b border-line py-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:py-6">
          <DashboardNav />
        </aside>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
