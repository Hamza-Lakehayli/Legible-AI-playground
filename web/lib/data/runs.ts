import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { runs as runtimeRuns } from "@/lib/db/runtime-read";

/**
 * Run queries — dynamic (never cached: they are per-workspace data), and
 * always scoped by workspaceId taken from the session, never from the
 * URL or request body (spec: tenant isolation).
 */
export type RuntimeRun = {
  id: string;
  demo: string;
  status: string;
  tokensIn: number;
  tokensOut: number;
  startedAt: Date;
  endedAt: Date | null;
};

export async function getRun(
  runId: string,
  workspaceId: string,
): Promise<RuntimeRun | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(runtimeRuns)
    .where(
      and(eq(runtimeRuns.id, runId), eq(runtimeRuns.workspaceId, workspaceId)),
    )
    .limit(1);

  return row ?? null;
}

export async function listRuns(
  workspaceId: string,
  limit = 20,
): Promise<RuntimeRun[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: runtimeRuns.id,
      demo: runtimeRuns.demo,
      status: runtimeRuns.status,
      tokensIn: runtimeRuns.tokensIn,
      tokensOut: runtimeRuns.tokensOut,
      startedAt: runtimeRuns.startedAt,
      endedAt: runtimeRuns.endedAt,
    })
    .from(runtimeRuns)
    .where(eq(runtimeRuns.workspaceId, workspaceId))
    .orderBy(desc(runtimeRuns.startedAt))
    .limit(limit);
}
