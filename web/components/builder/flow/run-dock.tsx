"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalCard } from "@/components/console/approval-card";
import { RunState } from "@/components/console/run-state";
import { RunTrace } from "@/components/console/run-trace";
import type { useRunSession } from "@/components/console/use-run-session";
import type { WorkflowSpec } from "@/lib/builder/schema";

type Session = ReturnType<typeof useRunSession>;

/**
 * The run deck, docked along the bottom of the canvas: input on one row,
 * then the live trace — node attribution, errors, and the human gate —
 * underneath. The trace opens itself the moment a run starts.
 */
export function RunDock({
  session,
  runInput,
  onRunInput,
  issues,
  graph,
}: {
  session: Session;
  runInput: string;
  onRunInput: (next: string) => void;
  issues: string[];
  graph: Pick<WorkflowSpec, "nodes" | "edges">;
}) {
  const { busy, runState, error, approval, runId, events, runActive } = session;
  const [openedManually, setOpenedManually] = useState(false);

  // While a run is live (or just failed) the trace is the point of the dock;
  // after a finished run the author toggles it if they want it again.
  const forced = Boolean(runActive) || Boolean(error);
  const showTrace = forced || openedManually;

  const canRun =
    issues.length === 0 && !busy && !runActive && session.connection !== "uncertain" && session.connection !== "checking" && runInput.trim().length > 0;

  return (
    <section
      aria-label="Run deck"
      className="absolute inset-x-0 bottom-0 z-40 rounded-t-panel border-t border-line bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
    >
      {issues.length && !runActive ? (
        <div className="border-b border-warning/30 bg-warning/5 px-4 py-1.5">
          <p className="font-mono text-[10px] text-warning uppercase">
            Before you run · {issues.length}
          </p>
          <ul className="text-[12px]/5 text-ink">
            {issues.map((issue) => (
              <li key={issue}>— {issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-end gap-3 px-4 py-2.5">
        <div className="hidden shrink-0 pb-2 sm:block">
          <p className="font-mono text-[10px] text-muted uppercase">
            Run · {graph.nodes.length} nodes
          </p>
        </div>
        <label htmlFor="run-input" className="sr-only">
          Run input
        </label>
        <textarea
          id="run-input"
          value={runInput}
          rows={1}
          maxLength={5000}
          placeholder="Describe the task for this run…"
          disabled={busy || runActive}
          onChange={(event) => onRunInput(event.target.value)}
          className="min-h-0 max-h-24 min-w-0 flex-1 resize-none rounded-[4px] border border-line bg-surface px-2.5 py-2 text-[13px]/5 text-ink transition-colors focus:border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-accent disabled:opacity-60"
        />
        <span className="hidden shrink-0 self-center font-mono text-[10px] text-muted md:block">
          {runInput.length} / 5000
        </span>

        {!showTrace && events.length ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setOpenedManually(true)}
          >
            Trace ({events.length})
          </Button>
        ) : null}

        {runState ? <RunState state={runState} className="shrink-0" /> : null}
        {session.connection === "checking" ? <span role="status" className="text-xs text-muted">Checking connection…</span> : null}
        {session.connection === "unreachable" ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void session.retryConnection()}>Retry connection</Button>
        ) : null}

        <Button
          size="sm"
          className="shrink-0"
          onClick={() => void session.start(runInput)}
          disabled={!canRun}
          title={issues[0]}
        >
          {busy || runActive ? "Run active" : "Run workflow"}
        </Button>
      </div>

      {showTrace ? (
        <div className="border-t border-line">
          <div className="flex items-center justify-between gap-2 px-4 py-1.5">
            <p className="font-mono text-[10px] text-muted uppercase">
              Trace{runId ? ` · ${runId}` : ""}
            </p>
            <span className="flex items-center gap-2">
              {!forced ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    setOpenedManually(false);
                  }}
                >
                  <ChevronDown className="size-3.5" aria-hidden />
                  Hide
                </Button>
              ) : null}
            </span>
          </div>

          <div className="max-h-[38vh] min-h-[3.5rem] overflow-y-auto px-4 pb-3">
            {error ? (
              <p
                role="alert"
                className="mb-3 border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm text-ink"
              >
                {error}
              </p>
            ) : null}

            {approval ? (
              <div className="mb-3">
                <ApprovalCard
                  approval={approval}
                  editedArguments={session.editedArguments}
                  onEditedArguments={session.setEditedArguments}
                  busy={busy}
                  onDecide={(decision) => void session.decideApproval(decision)}
                />
              </div>
            ) : null}

            {events.length ? (
              <RunTrace events={events} />
            ) : !error && !approval ? (
              // The shared RunTrace empty state is hero-sized (min-h-72); the
              // dock stays compact until there is something to show.
              <p className="pb-2 font-mono text-[10px] text-muted uppercase">
                No run events yet — start a run to see node entry, decisions,
                and approvals.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!runState && !forced && !openedManually ? (
        <div className="px-4 pb-2">
          <Badge variant="neutral">Ready · mock tools only · no external side effects</Badge>
        </div>
      ) : null}
    </section>
  );
}
