import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

/**
 * Workspace queries — dynamic, always derived from the session user id.
 */
export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
};

export async function getWorkspaceForUser(
  userId: string,
): Promise<Workspace | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({ id: workspaces.id, name: workspaces.name, ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .limit(1);

  return row ?? null;
}
