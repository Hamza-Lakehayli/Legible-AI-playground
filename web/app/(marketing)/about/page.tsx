import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "About",
  description:
    "An independent AI engineering showcase: what it is, how it is built, and what it deliberately does not claim.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Section>
      <Container className="max-w-3xl">
        <Eyebrow>About</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Engineering shown as engineering.
        </h1>

        <div className="mt-10 space-y-6 text-[17px]/8 text-ink">
          <p>
            This site is a working demonstration, not a brochure. Every capability
            described on the work pages runs here: an agent that plans against declared
            tools, a policy layer that pauses risky actions, a supervisor that shows its
            delegations, MCP servers whose forms are generated from their own schemas.
          </p>
          <p>
            The things I care about are the unglamorous parts — validation at the
            boundaries, permissions that live in code rather than in a prompt, event
            traces with sequence numbers, quotas that degrade politely. Those parts
            decide whether agent software survives contact with production, so they are
            the parts this showcase makes visible.
          </p>
        </div>

        <div className="mt-12 border-t border-line pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">What this site is</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px]/7 text-muted">
            <li>A showcase: billing runs in Polar sandbox mode with test cards — nothing is sold.</li>
            <li>A sandbox: every demo tool is a mock or read-only over seeded data, with no outbound network access.</li>
            <li>Honest about state: recorded runs say they are recorded; limits and failures are designed screens, not surprises.</li>
            <li>Not a source of testimonials, client logos, or invented performance numbers — the demos are the evidence.</li>
          </ul>
        </div>

        <div className="mt-12 border-t border-line pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">How it is built</h2>
          <dl className="mt-4 divide-y divide-line rounded-panel border border-line bg-surface">
            {[
              { label: "Web app", value: "Next.js 16 App Router · Server Components · Tailwind CSS" },
              { label: "Runtime", value: "Python FastAPI service — agents, policies, SSE" },
              { label: "Database", value: "PostgreSQL with two schemas: web (Next.js) and runtime (FastAPI)" },
              { label: "Model", value: "NVIDIA-hosted NIM endpoint, OpenAI-compatible, free tier" },
              { label: "Billing", value: "Polar (merchant of record), sandbox mode" },
              { label: "Auth", value: "Auth.js — credentials first, JWT sessions, personal workspaces" },
            ].map((row) => (
              <div key={row.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-ink">{row.label}</dt>
                <dd className="font-mono text-[13px]/6 text-muted">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/offerings">Explore the work</ButtonLink>
          <ButtonLink href="/playground" variant="secondary">
            Try a demo
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
