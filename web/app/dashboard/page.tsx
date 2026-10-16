import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ScrollText, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getWorkspaceForUser } from "@/lib/data/workspace";
import { getEntitlements } from "@/lib/entitlements";
import { listRuns } from "@/lib/data/runs";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false },
};

/** Auth-gated segment: blocking by declaration, consistent with the layout. */
export const instant = false;

export default async function DashboardPage() {
  const session = await requireSession();
  const workspace = session.user.workspaceId
    ? await getWorkspaceForUser(session.user.id)
    : null;
  if (!workspace) redirect("/login");

  const entitlements = await getEntitlements(workspace.id);
  const runs = await listRuns(workspace.id, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {workspace.name} — plan, quota, and the latest activity.
        </p>
      </div>

      {/* Plan + limits */}
      <section aria-labelledby="plan-heading" className="rounded-panel border border-line bg-surface">
        <h2 id="plan-heading" className="border-b border-line px-6 py-3 text-sm font-medium text-ink">
          Plan & limits
        </h2>
        <dl className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
          {[
            { label: "Plan", value: entitlements.plan },
            { label: "Runs per day", value: String(entitlements.runsPerDay) },
            { label: "Run history", value: `${entitlements.historyDays} days` },
            { label: "Priority queue", value: entitlements.priorityQueue ? "Yes" : "No" },
          ].map((item) => (
            <div key={item.label} className="bg-surface px-6 py-5">
              <dt className="font-mono text-[11px] tracking-wide text-muted uppercase">
                {item.label}
              </dt>
              <dd className="mt-1 font-mono text-xl text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-line px-6 py-3 text-xs/5 text-muted">
          Upgrades run through Polar sandbox checkout in milestone 6 — test cards
          only, nothing is ever charged. Limits take effect the moment the
          webhook lands.
        </p>
      </section>

      {/* Recent runs */}
      <section aria-labelledby="runs-heading" className="rounded-panel border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <h2 id="runs-heading" className="text-sm font-medium text-ink">
            Recent runs
          </h2>
          <span className="font-mono text-xs text-muted">{runs.length} / 5 shown</span>
        </div>
        {runs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No runs yet"
            detail="Every playground demo lands here with its trace, token usage, and status. The governed-agent demo opens with milestone 3."
            action={{ label: "Preview the demos", href: "/playground" }}
          />
        ) : (
          <ul className="divide-y divide-line">
            {runs.map((run) => (
              <li key={run.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                <span className="font-mono text-xs text-muted">{run.id}</span>
                <span className="text-ink">{run.demo}</span>
                <span className="ml-auto font-mono text-xs text-muted">{run.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending approvals */}
      <section aria-labelledby="approvals-heading" className="rounded-panel border border-line bg-surface">
        <h2 id="approvals-heading" className="border-b border-line px-6 py-3 text-sm font-medium text-ink">
          Pending approvals
        </h2>
        <EmptyState
          icon={ShieldCheck}
          title="Nothing waiting on you"
          detail="High-risk tool calls pause here until you approve, edit, or reject them — with the full arguments visible."
        />
      </section>
    </div>
  );
}
