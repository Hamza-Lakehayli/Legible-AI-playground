import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Six sandboxed demos: a governed agent with approval gates, an MCP explorer, an agent builder, and more. Sample runs need no account.",
  alternates: { canonical: "/playground" },
};

const demos = [
  { name: "Governed agent", depth: "IN DEPTH", detail: "Risky tool calls pause until you approve, edit, or reject." },
  { name: "MCP explorer", depth: "IN DEPTH", detail: "List tools, fill a schema-generated form, call one." },
  { name: "Agent builder", depth: "IN DEPTH", detail: "Assemble a run on a drag-and-drop canvas; each node is a LangGraph node." },
  { name: "Multi-agent run", depth: "THIN", detail: "Watch a supervisor delegate to workers on a live trace." },
  { name: "Skills", depth: "THIN", detail: "Run a skill on sample input, compare with and without." },
  { name: "Automations", depth: "THIN", detail: "A simulated ticket walks trigger → steps → approval gate." },
];

export default function PlaygroundPage() {
  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>Playground</Eyebrow>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Run the work, not a video.
          </h1>
          <p className="mt-4 text-lg/8 text-muted">
            Six sandboxed demos on a free-tier hosted model. Every tool is a mock,
            sample runs need no account, and every run leaves a trace you can inspect.
          </p>
        </div>

        <div className="mt-12 max-w-3xl overflow-hidden rounded-panel border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="font-mono text-xs text-muted">demo switcher</p>
            <Badge variant="warning">CONSOLE SHIPS IN MILESTONE 3</Badge>
          </div>
          <ul className="divide-y divide-line">
            {demos.map((demo) => (
              <li key={demo.name} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{demo.name}</span>
                    <Badge>{demo.depth}</Badge>
                  </p>
                  <p className="mt-1 text-sm/6 text-muted">{demo.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-4">
            <p className="text-sm/6 text-muted">
              The playground console — execution traces, approval cards, the agent
              builder canvas, and the SSE run lifecycle — is the next build milestone
              (M3, the governed agent end-to-end). The marketing pages around it are
              live now.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/offerings/governed-agents" variant="secondary" size="sm">
                Read how the governed agent works
              </ButtonLink>
              <ButtonLink href="/pricing" variant="ghost" size="sm">
                See run limits
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
