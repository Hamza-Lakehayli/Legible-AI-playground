import type { Metadata } from "next";
import { PlaygroundEntryLink } from "@/components/transitions/playground-entry-link";
import { Container, Section } from "@/components/ui/layout";
import {
  CanvasSection,
  ClosingCta,
  GovernanceSection,
  TraceSection,
} from "@/components/marketing/home-sections";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Section className="flex min-h-[calc(100dvh-4rem)] items-center py-16 md:py-20">
        <Container>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
              Build AI agents visually. Stay in control.
            </h1>
            <p className="mt-6 max-w-2xl text-base/7 text-muted sm:text-lg/8">
              Legible is a visual canvas for connecting agents, tools, and
              decisions—with human approval built into the workflow.
            </p>
            <PlaygroundEntryLink
              variant="primary"
              className="mt-9 min-h-12 px-7 text-[15px] font-semibold shadow-[0_8px_24px_-16px_rgba(25,26,24,0.55)]"
            >
              Open Playground
            </PlaygroundEntryLink>
          </div>
        </Container>
      </Section>

      <CanvasSection />
      <GovernanceSection />
      <TraceSection />
      <ClosingCta />
    </>
  );
}
