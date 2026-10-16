import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    /** Set by the credentials authorize callback. */
    workspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    workspaceId?: string | null;
  }
}
