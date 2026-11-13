import Image from "next/image";
import { ApprovalPreview } from "@/components/marketing/previews";
import { ConsolePreview } from "@/components/marketing/console-preview";
import { PlaygroundEntryLink } from "@/components/transitions/playground-entry-link";
import { Container, Section } from "@/components/ui/layout";

const modelProviders = [
  { name: "OpenAI", icon: "openai" },
  { name: "Anthropic", icon: "anthropic" },
  { name: "Google Gemini", icon: "gemini" },
  { name: "Mistral", icon: "mistral" },
  { name: "NVIDIA", icon: "nvidia" },
  { name: "Groq", icon: "groq" },
  { name: "AWS Bedrock", icon: "bedrock" },
  { name: "DeepSeek", icon: "deepseek" },
  { name: "Cohere", icon: "cohere" },
  { name: "xAI", icon: "xai" },
  { name: "OpenRouter", icon: "openrouter" },
];

const localRuntimes = [
  { name: "Ollama", icon: "ollama" },
  { name: "llama.cpp", icon: "llama-cpp" },
];

export function CanvasSection() {
  return (
    <Section id="product" className="home-chapter home-canvas home-texture">
      <Container className="max-w-7xl">
        <div className="home-canvas-layout grid items-center gap-8 lg:grid-cols-[0.75fr_1.6fr] lg:gap-16">
          <div className="order-2 w-full min-w-0 max-w-md lg:order-1">
            <p className="text-sm font-medium text-accent-ink">The canvas</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              A clear view of the whole workflow.
            </h2>
            <p className="mt-4 text-base/7 text-muted">
              Compose agents, decisions, and model steps while keeping the whole
              workflow in view.
            </p>
            <div className="home-provider-ecosystem mt-7 min-w-0 border-t border-line pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm/6">
                <p className="font-medium text-ink">Model providers</p>
                <span className="text-xs text-muted">Planned integrations</span>
              </div>
              <ul aria-label="A selection of model providers available through LangChain, planned for Legible" className="mt-3 flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 text-[9px]/3 sm:grid sm:grid-cols-4 sm:gap-x-2 sm:gap-y-2 sm:overflow-visible">
                {modelProviders.map(({ name, icon }) => (
                  <li key={name} className="flex w-14 shrink-0 snap-start flex-col items-center gap-1.5 text-center sm:w-auto sm:min-w-0">
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-accent-ink shadow-[0_1px_2px_oklch(20%_0.01_90_/_0.06),0_5px_12px_-8px_oklch(20%_0.01_90_/_0.16)] sm:size-8">
                      <Image
                        src={`/images/providers/${icon}.svg`}
                        alt=""
                        aria-hidden="true"
                        width={24}
                        height={24}
                        unoptimized
                        className="size-6"
                      />
                    </span>
                    <span className="text-[9px]/3 text-muted sm:text-[10px]/3">{name}</span>
                  </li>
                ))}
              </ul>
              <div className="home-local-models mt-3 border-t border-line pt-3">
                <p className="text-xs font-medium text-accent-ink">Locally hosted</p>
                <ul aria-label="Local model runtimes" className="mt-3 grid grid-cols-4 gap-x-2 gap-y-2 pb-2">
                  {localRuntimes.map(({ name, icon }) => (
                    <li key={name} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                      <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg border border-line bg-surface shadow-[0_1px_2px_oklch(20%_0.01_90_/_0.06),0_5px_12px_-8px_oklch(20%_0.01_90_/_0.16)]">
                        <Image
                          src={`/images/providers/${icon}.svg`}
                          alt=""
                          aria-hidden="true"
                          width={24}
                          height={24}
                          unoptimized
                          className="size-6"
                        />
                      </span>
                      <span className="text-[9px]/3 text-muted sm:text-[10px]/3">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-xs/5 text-muted">
                Current demo: NVIDIA. Capabilities vary by model.
              </p>
            </div>
          </div>
          <figure className="order-1 w-full min-w-0 lg:order-2">
            <div className="home-product-visual">
              <Image
                src="/images/product/workflow-canvas.png"
                alt="Workflow canvas with a support agent, refund decision branch, model steps, and the agent's tool approval settings."
                width={1440}
                height={1000}
                sizes="(max-width: 1023px) calc(100vw - 48px), 760px"
                className="home-canvas-image [--canvas-preview-height:none] lg:[--canvas-preview-height:calc(100dvh-14rem)]"
                style={{ maxHeight: "var(--canvas-preview-height)" }}
              />
            </div>
            <figcaption className="mt-4 hidden flex-wrap justify-between gap-2 text-xs/5 text-muted sm:flex">
              <span>The working Playground canvas</span>
              <span>Support workflow · demo data</span>
            </figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  );
}

export function GovernanceSection() {
  return (
    <Section id="governance" className="home-chapter">
      <Container className="max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-20">
          <div className="max-w-lg lg:col-start-2 lg:row-start-1">
            <p className="text-sm font-medium text-accent-ink">Governance</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Let agents act. Keep the decision yours.
            </h2>
            <p className="mt-4 text-base/7 text-muted">
              Allow a tool to run, ask for human approval, or deny access.
              Sensitive requests pause with their arguments ready for review.
            </p>
            <dl className="mt-8 hidden divide-y divide-line border-y border-line text-sm/6 sm:block">
              <div className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                <dt className="font-medium text-ink">Allow</dt>
                <dd className="text-muted">Run the permitted tool automatically.</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                <dt className="font-medium text-accent-ink">Ask</dt>
                <dd className="text-muted">Pause for approval, edits, or rejection.</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                <dt className="font-medium text-ink">Deny</dt>
                <dd className="text-muted">Keep the tool unavailable to the agent.</dd>
              </div>
            </dl>
          </div>
          <div className="relative min-w-0 lg:col-start-1 lg:row-start-1">
            <p className="mb-4 hidden text-sm font-medium text-muted sm:block">A decision before an action</p>
            <ApprovalPreview className="w-full" />
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function TraceSection() {
  return (
    <Section className="home-chapter home-detail">
      <Container className="max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="max-w-lg">
            <p className="text-sm font-medium text-accent-ink">Execution</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Follow the run. Inspect each action.
            </h2>
            <p className="mt-4 text-base/7 text-muted">
              See which tool was requested, what policy decided, and where human
              approval entered the run. One sequence, without guessing what happened.
            </p>
            <p className="mt-6 hidden border-l-2 border-accent pl-4 text-sm/6 text-muted sm:block">
              Tool requests and human decisions belong in the same record—not in separate conversations.
            </p>
          </div>
          <div className="home-trace-visual relative min-w-0">
            <div className="home-event-path" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
            <ConsolePreview variant="proof" />
            <p className="mt-3 text-right text-xs text-muted">
              Illustrative sample · mock tools · seeded demo data
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function ClosingCta() {
  return (
    <Section className="bg-page py-16 md:py-24">
      <Container className="max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-8 border-t border-line pt-12 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Build a workflow you can understand.
            </h2>
            <p className="mt-4 max-w-xl text-base/7 text-muted">
              Open the canvas to explore its nodes, policies, and sample workflow.
            </p>
          </div>
          <PlaygroundEntryLink variant="primary" className="min-h-12 shrink-0 px-7">
            Open Playground
          </PlaygroundEntryLink>
        </div>
      </Container>
    </Section>
  );
}
