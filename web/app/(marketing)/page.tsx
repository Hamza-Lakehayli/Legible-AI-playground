import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Capabilities, Architecture, ClosingCta, Principles } from "@/components/marketing/home-sections";
import { ConsolePreview } from "@/components/marketing/console-preview";
import { OfferingPreview } from "@/components/marketing/previews";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Section, SectionHeader } from "@/components/ui/layout";
import { getOfferings, type Offering } from "@/lib/data/offerings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const offerings = await getOfferings();
  const wide = offerings.find((o) => o.featured === "wide");
  const splits = offerings.filter((o) => o.featured === "split");
  const rest = offerings.filter((o) => !o.featured);

  return (
    <>
      {/* Hero — editorial composition, not a centered gradient (brief §6) */}
      <Section className="pb-14 md:pb-20 md:pt-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div>
              <Eyebrow>Independent AI engineering</Eyebrow>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
                AI systems you can inspect, test, and trust.
              </h1>
              <p className="mt-6 max-w-xl text-lg/8 text-muted">
                Agents, governed agents, multi-agent systems, and MCP servers —
                presented as working software with real traces, policy gates, and
                audit trails. Not slides. Not promises.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/offerings">Explore the work</ButtonLink>
                <ButtonLink href="/playground" variant="secondary">
                  Try a live demo
                </ButtonLink>
              </div>
              <p className="mt-5 font-mono text-xs text-muted">
                sample runs need no account · mock tools only
              </p>
            </div>
            <div>
              <ConsolePreview className="shadow-[0_16px_40px_-24px_rgba(25,26,24,0.35)]" />
              <p className="mt-3 text-center font-mono text-[11px] text-muted">
                the governed-agent console — tool calls, policy, approval, audit
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Capabilities />

      {/* Featured offerings — varied layouts, never a grid of identical cards */}
      <Section>
        <Container>
          <SectionHeader
            eyebrow="Work"
            title="Systems built to be inspected"
            lede="Each offering is something this site actually runs. The interface previews below are the real surfaces, not illustrations of them."
          />

          {wide ? (
            <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
              <WideCopy offering={wide} />
              <OfferingPreview preview={wide.preview} />
            </div>
          ) : null}

          {splits.map((offering, i) => (
            <div
              key={offering.slug}
              className="mt-14 grid items-center gap-10 border-t border-line pt-14 lg:grid-cols-2"
            >
              {i % 2 === 1 ? (
                <>
                  <SplitPreview offering={offering} />
                  <SplitCopy offering={offering} />
                </>
              ) : (
                <>
                  <SplitCopy offering={offering} />
                  <SplitPreview offering={offering} />
                </>
              )}
            </div>
          ))}

          <ul className="mt-14 border-t border-line">
            {rest.map((offering) => (
              <li
                key={offering.slug}
                className="grid gap-2 border-b border-line py-7 md:grid-cols-[210px_minmax(0,1fr)_auto] md:items-baseline md:gap-6"
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
                <div className="flex items-center gap-5 text-sm">
                  <Link
                    href={`/offerings/${offering.slug}`}
                    className="inline-flex items-center gap-1.5 font-medium text-accent-ink underline-offset-4 hover:underline"
                  >
                    Read <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                  {offering.demo ? (
                    <Link
                      href="/playground"
                      className="text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Try the demo
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Principles />
      <Architecture />
      <ClosingCta />
    </>
  );
}

function WideCopy({ offering }: { offering: Offering }) {
  return (
    <div>
      <Eyebrow>{offering.kindLabel}</Eyebrow>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
        {offering.headline}
      </h3>
      <p className="mt-4 text-base/7 text-muted">{offering.summary}</p>
      <ol className="mt-6 space-y-2">
        {offering.howItWorks.slice(0, 3).map((step, i) => (
          <li key={step.title} className="flex gap-3 text-sm/6">
            <span className="font-mono text-xs text-accent-ink">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-muted">{step.title.toLowerCase()}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center gap-5 text-sm">
        <Link
          href={`/offerings/${offering.slug}`}
          className="inline-flex items-center gap-1.5 font-medium text-accent-ink underline-offset-4 hover:underline"
        >
          How it works <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link
          href="/playground"
          className="text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Run the demo
        </Link>
      </div>
    </div>
  );
}

function SplitCopy({ offering }: { offering: Offering }) {
  return (
    <div>
      <Eyebrow>{offering.kindLabel}</Eyebrow>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">{offering.headline}</h3>
      <p className="mt-4 text-base/7 text-muted">{offering.summary}</p>
      <Link
        href={`/offerings/${offering.slug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
      >
        How it works <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function SplitPreview({ offering }: { offering: Offering }) {
  if (offering.preview === "console") {
    return <ConsolePreview variant="agents" />;
  }
  return <OfferingPreview preview={offering.preview} />;
}
