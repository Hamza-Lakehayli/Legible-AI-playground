import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, Eyebrow, Section } from "@/components/ui/layout";
import { getOfferings } from "@/lib/data/offerings";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Agents, governed agents, multi-agent systems, MCP servers, skills, automations, and consulting — each with a runnable demo.",
  alternates: { canonical: "/offerings" },
};

export default async function OfferingsPage() {
  const offerings = await getOfferings();

  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>Work / Offerings</Eyebrow>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Everything here runs. That is the point.
          </h1>
          <p className="mt-4 text-lg/8 text-muted">
            Each offering pairs a written explanation with a playground demo. The
            interfaces shown on these pages are the real ones.
          </p>
        </div>

        <ul className="mt-14 border-t border-line">
          {offerings.map((offering) => (
            <li key={offering.slug} className="border-b border-line">
              <Link
                href={`/offerings/${offering.slug}`}
                className="group grid gap-3 py-7 md:grid-cols-[210px_minmax(0,1fr)_auto] md:items-baseline md:gap-6"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{offering.title}</p>
                  <p className="font-mono text-[11px] tracking-wide text-muted uppercase">
                    {offering.kindLabel}
                  </p>
                </div>
                <div className="max-w-xl">
                  <p className="text-[15px]/7 text-ink">{offering.headline}</p>
                  <p className="mt-1 text-sm/6 text-muted">{offering.summary}</p>
                </div>
                <span className="hidden items-center gap-1.5 text-sm font-medium text-accent-ink underline-offset-4 group-hover:underline md:inline-flex">
                  Read <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
