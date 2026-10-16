import "server-only";

/**
 * Session placeholder for milestone M2 (Auth.js). Until then every
 * visitor is a guest, so the pricing island renders without a session.
 * M2 replaces this with Auth.js — it must stay async and must read
 * cookies() so the pricing page keeps its dynamic island inside Suspense.
 */
export type Session = {
  userId: string;
  workspaceId: string;
  plan: "free" | "pro";
} | null;

export async function getSession(): Promise<Session> {
  return null;
}
