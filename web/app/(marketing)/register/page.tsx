import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Container, Section } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Register for a free workspace — 15 runs per day, all demos.",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <Section className="py-20 md:py-28">
      <Container className="max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm/6 text-muted">
          Free plan: 15 runs per day, all six demos, 7-day run history. No card,
          no trial clock.
        </p>
        <div className="mt-8 rounded-panel border border-line bg-surface p-6">
          <RegisterForm />
        </div>
      </Container>
    </Section>
  );
}
