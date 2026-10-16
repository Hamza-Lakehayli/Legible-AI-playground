import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
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
          Email and password, JWT sessions, one personal workspace.
        </p>
        <div className="mt-8 rounded-panel border border-line bg-surface p-6">
          <LoginForm />
        </div>
      </Container>
    </Section>
  );
}
