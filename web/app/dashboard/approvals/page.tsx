import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { EmptyState, MilestoneNote } from "@/components/dashboard/empty-state";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Approvals",
  robots: { index: false },
};

export const instant = false;

export default async function ApprovalsPage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          High-risk actions pause here until a human decides. Every decision is
          recorded with who and when.
        </p>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        <EmptyState
          icon={ShieldCheck}
          title="No pending approvals"
          detail="When a governed-agent run reaches a risky tool call, the decision panel opens here — approve, edit the arguments, or reject, with the policy reason attached."
        />
        <MilestoneNote milestone="M3">
          pending items above history, resolve via Server Action, expiry after
          10 minutes →
        </MilestoneNote>
      </div>
    </div>
  );
}
