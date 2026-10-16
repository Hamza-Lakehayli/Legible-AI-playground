import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { runs as runtimeRuns } from "@/lib/db/runtime-read";
import { users, workspaces } from "@/lib/db/schema";
import { getRun, listRuns } from "@/lib/data/runs";

/**
 * Spec M2 acceptance: a request for another workspace's run returns 404
 * (here: null — the page layer turns it into notFound). Two workspaces,
 * one run; workspace B must never see A's run by guessing its id.
 */
describe("tenant isolation", () => {
  const db = getDb();

  if (!db) {
    it.skip("requires DATABASE_URL", () => {});
    return;
  }

  let runId: string;
  let workspaceAId: string;
  let workspaceBId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const suffix = Date.now();

    const [userA] = await db
      .insert(users)
      .values({ email: `tenant-a-${suffix}@test.local`, passwordHash: "unused" })
      .returning();
    const [userB] = await db
      .insert(users)
      .values({ email: `tenant-b-${suffix}@test.local`, passwordHash: "unused" })
      .returning();
    userIds.push(userA.id, userB.id);

    const [wsA] = await db
      .insert(workspaces)
      .values({ name: "Workspace A", ownerId: userA.id })
      .returning();
    const [wsB] = await db
      .insert(workspaces)
      .values({ name: "Workspace B", ownerId: userB.id })
      .returning();
    workspaceAId = wsA.id;
    workspaceBId = wsB.id;

    const [run] = await db
      .insert(runtimeRuns)
      .values({
        id: `run_test_${randomUUID().slice(0, 8)}`,
        workspaceId: workspaceAId,
        userId: userA.id,
        demo: "governed-agent",
        status: "completed",
      })
      .returning();
    runId = run.id;
  });

  afterAll(async () => {
    // Cleanup (order matters: run cascade, then users via workspace FK).
    await db.delete(runtimeRuns).where(eq(runtimeRuns.id, runId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceAId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceBId));
    await db.delete(users).where(eq(users.id, userIds[0]));
    await db.delete(users).where(eq(users.id, userIds[1]));
  });

  it("returns a run to its own workspace", async () => {
    const run = await getRun(runId, workspaceAId);
    expect(run).not.toBeNull();
    expect(run?.id).toBe(runId);
  });

  it("hides the run from another workspace (guessed id)", async () => {
    const run = await getRun(runId, workspaceBId);
    expect(run).toBeNull();
  });

  it("lists only the workspace's own runs", async () => {
    const runsB = await listRuns(workspaceBId, 50);
    expect(runsB.find((r) => r.id === runId)).toBeUndefined();

    const runsA = await listRuns(workspaceAId, 50);
    expect(runsA.map((r) => r.id)).toContain(runId);
  });
});
