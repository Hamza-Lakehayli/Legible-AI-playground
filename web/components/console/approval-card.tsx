"use client";

import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Approval } from "@/components/console/use-run-session";

/**
 * The human gate. Shared by every surface so an approval looks and behaves
 * identically in the console, the agent card, and the workflow run panel.
 */
export function ApprovalCard({
  approval,
  editedArguments,
  onEditedArguments,
  busy,
  onDecide,
  className,
}: {
  approval: Approval;
  editedArguments: string;
  onEditedArguments: (value: string) => void;
  busy: boolean;
  onDecide: (decision: "approved" | "edited" | "rejected") => void;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="approval-title"
      className={cn(
        "border-l-2 border-warning bg-warning/10 p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-warning">
            HUMAN DECISION REQUIRED · {approval.risk.toUpperCase()} RISK
          </p>
          <h3 id="approval-title" className="mt-1 text-base font-medium text-ink">
            Review {approval.tool}
          </h3>
          <p className="mt-1 text-sm/6 text-muted">{approval.reason}</p>
        </div>
        <PauseCircle className="size-5 shrink-0 text-warning" aria-hidden />
      </div>
      <label
        htmlFor="approval-arguments"
        className="mt-4 block text-sm font-medium text-ink"
      >
        Proposed arguments (JSON)
      </label>
      <textarea
        id="approval-arguments"
        value={editedArguments}
        onChange={(event) => onEditedArguments(event.target.value)}
        disabled={busy}
        spellCheck={false}
        className="mt-2 min-h-24 w-full rounded-control border border-line bg-surface px-3 py-2 font-mono text-xs/5 text-ink focus:border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-accent disabled:opacity-60"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => onDecide("approved")} disabled={busy}>
          Approve as proposed
        </Button>
        <Button
          variant="secondary"
          onClick={() => onDecide("edited")}
          disabled={busy}
        >
          Edit and submit
        </Button>
        <Button variant="ghost" onClick={() => onDecide("rejected")} disabled={busy}>
          Reject
        </Button>
      </div>
    </section>
  );
}
