import { ArrowDown, ArrowRight, Bot, Network, Server, ShieldCheck, Workflow } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeader } from "@/components/ui/layout";
import { site } from "@/lib/site";

/** Capabilities strip (brief §6.1). */
export function Capabilities() {
  const items = [
    { name: "Agents", detail: "Tool loops with declared surfaces", icon: Bot },
    { name: "Governance", detail: "Policies that pause risky calls", icon: ShieldCheck },
    { name: "MCP", detail: "Schema-first tools you can read", icon: Server },
    { name: "Orchestration", detail: "Supervisors with legible traces", icon: Network },
    { name: "Automation", detail: "Event in, human at the gate", icon: Workflow },
  ];

  return (
    <div className="border-y border-line bg-surface">
      <Container>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-0">
          {items.map((item, i) => (
            <li
              key={item.name}
              className={`py-6 lg:py-8 ${
                i > 0 ? "lg:border-l lg:border-line lg:pl-6" : ""
              }`}
            >
              <item.icon className="size-4 text-accent" aria-hidden />
              <p className="mt-2 text-sm font-medium text-ink">{item.name}</p>
              <p className="mt-1 text-[13px]/5 text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

/** "How I approach systems" — concrete principles, no buzzwords. */
export function Principles() {
  const principles = [
    {
      title: "Declare the surface before the model runs",
      detail:
        "Tools, schemas, and policies are registered before a run starts. The agent sees exactly that list — nothing improvised, nothing invented.",
    },
    {
      title: "The policy layer decides, never the model",
      detail:
        "A model can suggest an action; it cannot grant itself permission. Allow, ask, and deny live in code, where they can be tested and audited.",
    },
    {
      title: "Every run leaves a legible trace",
      detail:
        "Each step is an event with a sequence number and a timestamp. What you watch live is what you can replay later, event for event.",
    },
    {
      title: "Degrade honestly",
      detail:
        "Quotas, rate limits, and replay mode are designed states, not apologies. This site never fakes liveness — a recorded run says it is recorded.",
    },
  ];

  return (
    <Section className="border-t border-line">
      <Container>
        <SectionHeader
          eyebrow="Approach"
          title="How I approach systems"
          lede="Four rules that show up in everything on this site — and that you can watch the demos follow or break."
        />
        <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {principles.map((p, i) => (
            <li key={p.title} className="grid grid-cols-[auto_1fr] gap-5">
              <span className="font-mono text-sm text-accent-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-medium tracking-tight text-ink">{p.title}</h3>
                <p className="mt-2 text-[15px]/7 text-muted">{p.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/** Control plane / data plane diagram, drawn with borders not images. */
export function Architecture() {
  return (
    <Section className="border-t border-line bg-surface">
      <Container>
        <SectionHeader
          eyebrow="Architecture"
          title="Two planes, one signed token"
          lede="The browser talks to Next.js for pages and billing, and straight to the runtime for streamed runs. The model key only ever lives in the runtime."
        />

        <div className="mt-12 overflow-x-auto pb-2">
          <div className="min-w-[720px]">
            <div className="flex items-stretch gap-0">
              {[
                {
                  name: "Browser",
                  sub: "pages · console UI",
                  lines: ["Renders shell", "Consumes SSE"],
                },
                {
                  name: "Next.js · control plane",
                  sub: "web app",
                  lines: ["Marketing, auth, billing", "Quota check, token minting"],
                  accent: true,
                },
                {
                  name: "FastAPI · data plane",
                  sub: "agent runtime",
                  lines: ["Runs agents & policies", "Persists every event"],
                  accent: true,
                },
                {
                  name: "NVIDIA NIM",
                  sub: "hosted model",
                  lines: ["OpenAI-compatible", "Free-tier endpoint"],
                },
              ].map((box, i) => (
                <div key={box.name} className="flex flex-1 items-center">
                  {i > 0 ? (
                    <div className="flex w-14 shrink-0 flex-col items-center px-1">
                      <span className="font-mono text-[9px] leading-3 text-muted">
                        {i === 1 ? "signed" : i === 2 ? "stream" : "calls"}
                      </span>
                      <ArrowRight className="my-0.5 size-3.5 text-accent" aria-hidden />
                      <span className="font-mono text-[9px] leading-3 text-muted">
                        {i === 1 ? "token" : i === 2 ? "SSE" : ""}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={`flex-1 rounded-panel border p-4 ${
                      box.accent ? "border-accent/40 bg-accent-soft/40" : "border-line bg-page"
                    }`}
                  >
                    <p className="text-sm font-medium text-ink">{box.name}</p>
                    <p className="font-mono text-[10px] text-muted">{box.sub}</p>
                    <ul className="mt-2 space-y-1">
                      {box.lines.map((l) => (
                        <li key={l} className="text-[12px]/5 text-muted">
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 pl-1">
              <ArrowDown className="mt-1 size-3.5 shrink-0 text-muted" aria-hidden />
              <p className="text-[12px]/5 text-muted">
                Postgres (one database, two schemas — <span className="font-mono">web</span>{" "}
                written by Next.js, <span className="font-mono">runtime</span> written by
                FastAPI) · Polar for sandbox billing · Redis-backed quotas on the shared
                free model key.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/** Closing call to action. */
export function ClosingCta() {
  return (
    <Section className="border-t border-line">
      <Container>
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Watch an agent ask permission.
            </h2>
            <p className="mt-3 max-w-xl text-base/7 text-muted">
              The governed-agent demo pauses mid-run, shows its proposed arguments, and
              waits. Sample runs need no account — mock tools only, nothing real is
              touched.
            </p>
          </div>
          <div className="flex flex-row flex-wrap gap-3 md:justify-end">
            <ButtonLink href="/playground">Try a live demo</ButtonLink>
            <ButtonLink href="/offerings/governed-agents" variant="secondary">
              How it works
            </ButtonLink>
          </div>
        </div>
        <p className="mt-6 font-mono text-xs text-muted">
          {site.name} — {site.tagline.toLowerCase()}
        </p>
      </Container>
    </Section>
  );
}
