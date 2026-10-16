import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your workspace.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Section className="py-20 md:py-28">
      <Container className="max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm/6 text-muted">
          Email and password, JWT sessions, one personal workspace. GitHub login
          arrives later, behind a flag.
        </p>
        <form className="mt-8 space-y-4 opacity-60" aria-disabled>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              disabled
              placeholder="you@example.com"
              className="mt-1.5 h-10 w-full rounded-control border border-line bg-surface px-3 text-sm placeholder:text-muted"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              disabled
              placeholder="••••••••"
              className="mt-1.5 h-10 w-full rounded-control border border-line bg-surface px-3 text-sm placeholder:text-muted"
            />
          </div>
          <button
            type="button"
            disabled
            className="h-10 w-full rounded-control bg-accent text-sm font-medium text-white"
          >
            Log in
          </button>
          <p className="font-mono text-xs text-muted">
            auth lands in milestone 2 — the data layer and quotas build on it
          </p>
        </form>
      </Container>
    </Section>
  );
}
