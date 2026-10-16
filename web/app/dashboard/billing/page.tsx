import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getWorkspaceForUser } from "@/lib/data/workspace";
import { getEntitlements } from "@/lib/entitlements";
import { EmptyState, MilestoneNote } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false },
};

export const instant = false;

export default async function BillingPage() {
  const session = await requireSession();
  const workspace = session.user.workspaceId
    ? await getWorkspaceForUser(session.user.id)
    : null;
  if (!workspace) redirect("/login");

  const entitlements = await getEntitlements(workspace.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Plan, invoices, and consulting orders. Test mode only — nothing is
          ever charged.
        </p>
      </div>

      <section className="rounded-panel border border-line bg-surface">
        <h2 className="border-b border-line px-6 py-3 text-sm font-medium text-ink">
          Current plan
        </h2>
        <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-3">
          {[
            { label: "Plan", value: entitlements.plan },
            { label: "Status", value: entitlements.status },
            { label: "Runs per day", value: String(entitlements.runsPerDay) },
          ].map((item) => (
            <div key={item.label} className="bg-surface px-6 py-5">
              <p className="font-mono text-[11px] tracking-wide text-muted uppercase">
                {item.label}
              </p>
              <p className="mt-1 font-mono text-xl text-ink">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-line px-6 py-3 text-xs/5 text-muted">
          Subscriptions mirror Polar via webhooks; upgrades and cancellations
          go through the Polar customer portal.
        </p>
      </section>

      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        <EmptyState
          icon={CreditCard}
          title="No invoices or orders yet"
          detail="Invoices appear after a Polar sandbox checkout; consulting orders appear after a one-off checkout. Both are webhook-driven and idempotent."
        />
        <MilestoneNote milestone="M6">
          Polar checkout, customer portal, webhook mirror, entitlements
          revalidation →
        </MilestoneNote>
      </div>
    </div>
  );
}
