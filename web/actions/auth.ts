"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { signOut } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users, workspaces, subscriptions } from "@/lib/db/schema";

/**
 * Auth Server Actions — public endpoints (spec: each validates input
 * with Zod and re-checks state itself; never trust the client).
 */

const registerSchema = z.object({
  email: z.email("Enter a valid email address.").max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200),
});

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; field?: "email" | "password" };

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] === "password" ? "password" : "email";
    return { ok: false, error: issue?.message ?? "Invalid input.", field };
  }

  const db = getDb();
  if (!db) return { ok: false, error: "Database is not configured." };

  const email = parsed.data.email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      field: "email",
    };
  }

  const passwordHash = await hash(parsed.data.password);

  // One transaction: user + personal workspace + free subscription row.
  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, passwordHash })
      .returning();

    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: "Personal workspace", ownerId: user.id })
      .returning();

    await tx.insert(subscriptions).values({
      workspaceId: workspace.id,
      plan: "free",
      status: "inactive",
    });
  });

  return { ok: true };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
