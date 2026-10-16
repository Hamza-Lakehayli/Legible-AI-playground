import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import { getDb } from "@/lib/db";
import { users, workspaces } from "@/lib/db/schema";

/**
 * Auth.js v5 — credentials only for now (spec: GitHub login stays behind
 * a flag until an OAuth app exists). JWT sessions are required for
 * credentials providers. The workspace id rides inside the signed token
 * so every server-side query can scope to it without a DB roundtrip.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const db = getDb();
        if (!db) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!user?.passwordHash) return null;

        const valid = await verify(user.passwordHash, password);
        if (!valid) return null;

        const [workspace] = await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.ownerId, user.id))
          .limit(1);

        return {
          id: user.id,
          email: user.email,
          name: user.email.split("@")[0],
          workspaceId: workspace?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.workspaceId =
          (user as { workspaceId?: string | null }).workspaceId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.workspaceId =
          typeof token.workspaceId === "string" ? token.workspaceId : null;
      }
      return session;
    },
  },
});
