import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Capabilities, Architecture, ClosingCta, Principles } from "@/components/marketing/home-sections";
import { ConsolePreview } from "@/components/marketing/console-preview";
import { OfferingPreview } from "@/components/marketing/previews";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Section, SectionHeader } from "@/components/ui/layout";
import { getOfferings, type Offering } from "@/lib/data/offerings";
import { PlaygroundEntryLink } from "@/components/transitions/playground-entry-link";

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
      {/* One clear entry point; the workflow is the hero. */}
      <Section className="pb-10 pt-14 md:pb-14 md:pt-20">
        <Container>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Eyebrow>Independent AI engineering</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
              AI systems you can inspect, test, and trust.
            </h1>
            <p className="mt-5 max-w-2xl text-base/7 text-muted sm:text-lg/8">
              Open a workflow canvas, inspect a governed run, and see exactly where a human decision belongs.
            </p>
            <PlaygroundEntryLink variant="primary" className="mt-8 min-h-12 px-7 text-[15px] font-semibold shadow-[0_8px_24px_-16px_rgba(25,26,24,0.55)]">
              Open Playground
            </PlaygroundEntryLink>
            <p className="mt-3 max-w-xl text-sm/6 text-muted">
              The workflow editor is available in this protected preview; live runs are being tested.
            </p>
            <ButtonLink href="/offerings" variant="secondary" size="sm" className="mt-5">
              Explore the work <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section className="pt-0 pb-16 md:pb-20">
        <Container>
          <div className="mx-auto max-w-4xl">
            <ConsolePreview className="shadow-[0_16px_40px_-24px_rgba(25,26,24,0.35)]" />
            <p className="mt-3 text-center font-mono text-[11px] text-muted">
              the governed-agent console — tool calls, policy, approval, audit
            </p>
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
                    <PlaygroundEntryLink
                      className="text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Try the demo
                    </PlaygroundEntryLink>
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
        <PlaygroundEntryLink
          className="text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Run the demo
        </PlaygroundEntryLink>
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
