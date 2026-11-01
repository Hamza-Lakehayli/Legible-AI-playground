import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { ConsolePreview } from "@/components/marketing/console-preview";
import { OfferingPreview } from "@/components/marketing/previews";
import { ButtonLink } from "@/components/ui/button";
import { PlaygroundEntryLink } from "@/components/transitions/playground-entry-link";
import { Container, Section } from "@/components/ui/layout";
import { site } from "@/lib/site";
import { getOffering, getOfferings } from "@/lib/data/offerings";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const offerings = await getOfferings();
  return offerings.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { slug } = await params;
  const offering = await getOffering(slug);
  if (!offering) return {};
  return {
    title: offering.title,
    description: offering.summary,
    alternates: { canonical: `/offerings/${offering.slug}` },
    openGraph: {
      title: `${offering.title} — ${offering.headline}`,
      description: offering.summary,
      url: `/offerings/${offering.slug}`,
    },
  };
}

export default function OfferingPage(props: PageProps<"/offerings/[slug]">) {
  return (
    <Suspense fallback={<OfferingFallback />}>
      <OfferingContent params={props.params} />
    </Suspense>
  );
}

function OfferingFallback() {
  return (
    <Section aria-busy="true" aria-live="polite">
      <Container>
        <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="mt-6 h-12 w-2/3 max-w-xl animate-pulse rounded bg-surface-muted" />
        <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded bg-surface-muted" />
      </Container>
    </Section>
  );
}

async function OfferingContent({ params }: Params) {
  const { slug } = await params;
  const offering = await getOffering(slug);
  if (!offering) notFound();

  const related = (await getOfferings()).filter((o) =>
    offering.related.includes(o.slug),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: offering.title,
    description: offering.summary,
    provider: { "@type": "Organization", name: site.name },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <Section className="pb-10 md:pb-14 md:pt-16">
        <Container>
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/offerings" className="underline-offset-4 hover:text-ink hover:underline">
                  Work
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="font-mono text-xs tracking-wide uppercase">
                {offering.kindLabel}
              </li>
            </ol>
          </nav>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            {offering.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg/8 text-muted">{offering.summary}</p>
        </Container>
      </Section>

      {/* Interface preview */}
      <Container>
        <div className="rounded-panel border border-line bg-surface p-4 md:p-6">
          {offering.preview === "console" ? (
            <ConsolePreview />
          ) : (
            <OfferingPreview preview={offering.preview} />
          )}
          <p className="mt-3 text-center font-mono text-[11px] text-muted">
            interface preview — the real surface lives in the playground
          </p>
        </div>
      </Container>

      {/* Problem / approach */}
      <Section className="pb-0">
        <Container>
          <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="font-mono text-xs font-medium tracking-[0.14em] text-muted uppercase">
                The problem
              </h2>
              <p className="mt-4 text-[17px]/8 text-ink">{offering.problem}</p>
            </div>
            <div>
              <h2 className="font-mono text-xs font-medium tracking-[0.14em] text-muted uppercase">
                The approach
              </h2>
              <p className="mt-4 text-[17px]/8 text-ink">{offering.approach}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section className="pb-0">
        <Container>
          <div className="border-t border-line pt-12">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              How it works
            </h2>
            <ol className="mt-8 max-w-3xl">
              {offering.howItWorks.map((step, i) => (
                <li key={step.title} className="relative flex gap-6 pb-8 last:pb-0">
                  {i < offering.howItWorks.length - 1 ? (
                    <span aria-hidden className="absolute top-9 left-[13px] h-full w-px bg-line" />
                  ) : null}
                  <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-mono text-xs text-accent-ink">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-ink">{step.title}</h3>
                    <p className="mt-1 text-[15px]/7 text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* Try it */}
      <Section className="pb-0">
        <Container>
          <div className="grid items-center gap-6 rounded-panel border border-accent/30 bg-accent-soft/50 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {offering.demo ? "Try it in the playground" : "Reserve a package"}
              </h2>
              <p className="mt-1 text-sm/6 text-muted">
                {offering.demo
                  ? "Live runs require an account and use mock tools only."
                  : "One-off checkout in test mode — the booking link appears once the order is recorded."}
              </p>
            </div>
            {offering.demo ? (
              <PlaygroundEntryLink variant="secondary">
                Open Playground <ArrowRight className="size-4" aria-hidden />
              </PlaygroundEntryLink>
            ) : (
              <ButtonLink href="/pricing" variant="secondary">
                See packages <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            )}
          </div>
        </Container>
      </Section>

      {/* Technical details */}
      <Section className="pb-0">
        <Container>
          <div className="border-t border-line pt-12">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Technical details
            </h2>
            <dl className="mt-8 max-w-3xl divide-y divide-line rounded-panel border border-line bg-surface">
              {offering.tech.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-6"
                >
                  <dt className="text-sm font-medium text-ink">{row.label}</dt>
                  <dd className="font-mono text-[13px]/6 text-muted">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      {/* Related */}
      <Section className="pb-20">
        <Container>
          <div className="border-t border-line pt-12">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Related offerings
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/offerings/${r.slug}`}
                    className="group flex h-full flex-col rounded-panel border border-line bg-surface p-5 transition-colors hover:border-accent/40"
                  >
                    <p className="font-mono text-[11px] tracking-wide text-muted uppercase">
                      {r.kindLabel}
                    </p>
                    <p className="mt-2 font-medium text-ink">{r.headline}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-accent-ink underline-offset-4 group-hover:underline">
                      Read <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
