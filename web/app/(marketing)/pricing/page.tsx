import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container, Section } from "@/components/ui/layout";
import { getSession } from "@/lib/session";
import { getEntitlements } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Guest, Free, and Pro plans with concrete limits — plus consulting packages. Billing runs in Polar sandbox mode; nothing is sold.",
  alternates: { canonical: "/pricing" },
};

const plans = [
  {
    name: "Guest",
    price: "No account",
    priceSub: "3 runs per day",
    limits: [
      { label: "Runs per day", value: "3" },
      { label: "Demos", value: "Governed agent only" },
      { label: "Run history", value: "None" },
    ],
    cta: { label: "Start without an account", href: "/playground", variant: "secondary" as const },
  },
  {
    name: "Free",
    price: "$0",
    priceSub: "forever",
    limits: [
      { label: "Runs per day", value: "15" },
      { label: "Demos", value: "All six" },
      { label: "Run history", value: "7 days" },
    ],
    cta: { label: "Create a free account", href: "/register", variant: "primary" as const },
  },
  {
    name: "Pro",
    price: "$9",
    priceSub: "per month · Polar sandbox",
    highlighted: true,
    limits: [
      { label: "Runs per day", value: "60" },
      { label: "Demos", value: "All six, priority queue" },
      { label: "Run history", value: "90 days" },
    ],
    cta: { label: "Upgrade to Pro", href: "/register", variant: "secondary" as const },
  },
];

export default function PricingPage() {
  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-ink uppercase">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Concrete limits, not vibes.
          </h1>
          <p className="mt-4 text-lg/8 text-muted">
            Plans decide how much of the playground a visitor gets. The numbers below
            are the same ones the quota system enforces — the dashboard shows all
            three: plan, entitlement, usage.
          </p>
        </div>

        {/* Test-mode honesty strip */}
        <div className="mt-8 flex items-start gap-3 rounded-panel border border-line bg-surface p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <p className="text-sm/6 text-muted">
            <span className="font-medium text-ink">Test mode only.</span> Billing runs
            on Polar (merchant of record) in sandbox mode with test cards — Stripe is
            unavailable in Morocco, and nothing here is ever actually charged. The
            point is the real subscription lifecycle: checkout, webhooks, entitlements.
          </p>
        </div>

        {/* Current-plan dynamic island (spec: small island inside Suspense) */}
        <div className="mt-10 flex justify-center">
          <Suspense fallback={<div className="h-6 w-72 animate-pulse rounded bg-surface-muted" />}>
            <CurrentPlanNote />
          </Suspense>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-panel border bg-surface p-6 ${
                plan.highlighted ? "border-accent" : "border-line"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
                {plan.highlighted ? <Badge variant="accent">Upgrade choice</Badge> : null}
              </div>
              <p className="mt-4 font-mono text-3xl tracking-tight text-ink">
                {plan.price}
              </p>
              <p className="mt-1 text-sm text-muted">{plan.priceSub}</p>
              <dl className="mt-6 space-y-3 border-t border-line pt-5">
                {plan.limits.map((limit) => (
                  <div key={limit.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-muted">{limit.label}</dt>
                    <dd className="text-right text-sm font-medium text-ink">
                      {limit.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 pt-2">
                <ButtonLink
                  href={plan.cta.href}
                  variant={plan.cta.variant}
                  className="w-full"
                >
                  {plan.cta.label}
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>

        {/* Consulting one-offs */}
        <div className="mt-12 rounded-panel border border-line bg-surface p-6 md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Consulting packages</h2>
              <p className="mt-1 max-w-2xl text-sm/6 text-muted">
                One-off payments, not subscriptions: audit, architecture review, or a
                build sprint — each with a written scope and a fixed price. Checkout
                creates an order record; the booking link appears once it is paid.
              </p>
            </div>
            <ButtonLink href="/offerings/consulting" variant="secondary">
              See the scopes
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

async function CurrentPlanNote() {
  const session = await getSession();
  if (session?.user?.workspaceId) {
    const entitlements = await getEntitlements(session.user.workspaceId);
    return (
      <p className="rounded-control border border-line bg-surface px-3 py-1.5 font-mono text-xs text-muted">
        current plan: {entitlements.plan} — {entitlements.runsPerDay} runs/day,
        managed in the dashboard
      </p>
    );
  }
  return (
    <p className="rounded-control border border-line bg-surface px-3 py-1.5 font-mono text-xs text-muted">
      signed out — guest limits apply until you register
    </p>
  );
}
