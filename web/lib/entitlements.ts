import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

/**
 * Entitlements (spec: one server function maps plan + status to limits).
 * The runtime never reads billing tables — it only ever sees these
 * numbers inside the signed run token.
 */
export type Entitlements = {
  plan: "free" | "pro";
  status: string;
  runsPerDay: number;
  historyDays: number;
  priorityQueue: boolean;
};

const FREE: Entitlements = {
  plan: "free",
  status: "free",
  runsPerDay: 15,
  historyDays: 7,
  priorityQueue: false,
};

const PRO: Entitlements = {
  plan: "pro",
  status: "active",
  runsPerDay: 60,
  historyDays: 90,
  priorityQueue: true,
};

export async function getEntitlements(
  workspaceId: string,
): Promise<Entitlements> {
  const db = getDb();
  if (!db) return FREE;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  // Only a healthy Polar subscription upgrades the workspace; past_due,
  // canceled and unknown states all fall back to Free (spec).
  if (sub?.plan === "pro" && sub.status === "active") {
    return { ...PRO, status: sub.status };
  }

  return FREE;
}
