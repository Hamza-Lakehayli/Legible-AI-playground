import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getWorkspaceForUser } from "@/lib/data/workspace";
import { listRuns } from "@/lib/data/runs";
import { EmptyState, MilestoneNote } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Runs",
  robots: { index: false },
};

export const instant = false;

export default async function RunsPage() {
  const session = await requireSession();
  const workspace = session.user.workspaceId
    ? await getWorkspaceForUser(session.user.id)
    : null;
  if (!workspace) redirect("/login");

  const runs = await listRuns(workspace.id, 20);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="mt-1 text-sm text-muted">
          Every playground run for this workspace, newest first.
        </p>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        {runs.length === 0 ? (
          <>
            <EmptyState
              icon={ScrollText}
              title="No runs recorded"
              detail="Runs appear here the moment a demo executes — with status, demo name, and token totals. Filters in the URL arrive with milestone 4."
              action={{ label: "Preview the demos", href: "/playground" }}
            />
            <MilestoneNote milestone="M4">
              filterable table with demo/status/date, pagination, run detail
              with replay →
            </MilestoneNote>
          </>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-6 py-3 font-medium text-muted">Run</th>
                <th className="px-6 py-3 font-medium text-muted">Demo</th>
                <th className="px-6 py-3 font-medium text-muted">Status</th>
                <th className="px-6 py-3 font-medium text-muted">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-6 py-3 font-mono text-xs">{run.id}</td>
                  <td className="px-6 py-3">{run.demo}</td>
                  <td className="px-6 py-3 font-mono text-xs">{run.status}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted">
                    {run.tokensIn} in / {run.tokensOut} out
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
