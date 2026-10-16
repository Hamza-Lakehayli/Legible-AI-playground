/**
 * Offering content — the seed source of truth.
 *
 * The seed script (scripts/seed.ts) writes these rows into web.offerings;
 * lib/data reads from Postgres when configured and falls back to this
 * module so the site renders before the database exists.
 *
 * Copy rules from the design brief: specific promises, no invented
 * performance claims, no testimonials, no fabricated clients.
 */

export type OfferingPreview =
  | "console"
  | "approval"
  | "trace"
  | "workbench"
  | "compare"
  | "workflow"
  | "scopes";

export type HowItWorksStep = { title: string; detail: string };

export type Offering = {
  slug: string;
  kind: "agents" | "governance" | "orchestration" | "tools" | "automation" | "consulting";
  kindLabel: string;
  title: string;
  headline: string;
  summary: string;
  problem: string;
  approach: string;
  preview: OfferingPreview;
  /** Home page placement: wide feature row, split row, or compact list only. */
  featured?: "wide" | "split";
  order: number;
  /** Playground demo id, or null for consulting (checkout instead). */
  demo: string | null;
  howItWorks: HowItWorksStep[];
  tech: { label: string; value: string }[];
  related: string[];
};

export const offerings: Offering[] = [
  {
    slug: "governed-agents",
    kind: "governance",
    kindLabel: "Governed agents",
    title: "Governed agents",
    headline: "Risky actions wait for a human.",
    summary:
      "The agent loop with a policy layer in front of every tool call. High-risk actions pause the run, show their arguments, and wait for an approve, edit, or reject.",
    problem:
      "Approvals bolted on after the fact arrive too late and prove nothing. A refund that should have been checked has already executed by the time a reviewer sees it. Governance has to be a property of the run loop itself, not a review queue someone checks in the morning.",
    approach:
      "Every tool carries a policy — allow, ask, or deny — plus a risk level. The policy layer decides whether a call executes, waits, or is refused; the model never decides its own permissions. When a call needs a human, the run persists its state and lets go of its connection. An approval resumes the run exactly where it stopped, and every decision lands in the audit trail with who decided and when.",
    preview: "approval",
    featured: "wide",
    order: 1,
    demo: "governed-agent",
    howItWorks: [
      {
        title: "The agent requests a tool",
        detail:
          "It asks to call something like orders.refund with arguments. The request is an event, visible in the trace the moment it happens.",
      },
      {
        title: "Policy evaluates the call",
        detail:
          "The policy layer — not the model — checks the tool's policy and risk level against the proposed arguments. Low risk may run at once; high risk must wait.",
      },
      {
        title: "The run pauses and persists",
        detail:
          "State is written to the database and the connection is released. No model call stays open while a person decides. Approvals expire after ten minutes.",
      },
      {
        title: "A human approves, edits, or rejects",
        detail:
          "The proposed arguments are shown in full and can be edited; edits are re-validated against the tool schema before anything runs.",
      },
      {
        title: "The run resumes and the audit trail closes",
        detail:
          "The decision, the decider, and the tool result are appended to the same event log you watched live.",
      },
    ],
    tech: [
      { label: "Policy model", value: "allow / ask / deny per tool, with risk levels" },
      { label: "Decision owner", value: "policy layer, never the model" },
      { label: "Pause behavior", value: "state persisted, connection released, resumable" },
      { label: "Approval expiry", value: "10 minutes, then the run is marked expired" },
      { label: "Audit trail", value: "every decision recorded with actor and timestamp" },
    ],
    related: ["agents", "automations", "consulting"],
  },
  {
    slug: "agents",
    kind: "agents",
    kindLabel: "Agents",
    title: "Agents",
    headline: "Tool-using agents that know their limits.",
    summary:
      "Single agents that plan against a declared tool surface, validate every call, and say so plainly when they can't do something.",
    problem:
      "A model that improvises tool calls is a liability: wrong argument shapes, invented tools, and loops that burn tokens until something crashes. The failure is rarely the model — it's an undeclared surface.",
    approach:
      "Every tool is declared with a schema and a policy before the agent ever runs. The agent plans against that surface, each call is validated against the schema on both sides, and a hard cap on tool calls ends any loop deterministically. When nothing fits, the agent is instructed to say so — that answer is a success, not a failure.",
    preview: "console",
    featured: "split",
    order: 2,
    demo: "agent",
    howItWorks: [
      {
        title: "Declare the surface",
        detail:
          "Tools, schemas, and policies are registered before the run. The agent sees exactly this list and nothing else.",
      },
      {
        title: "Plan and call",
        detail:
          "The agent decides which tool fits the request and proposes arguments.",
      },
      {
        title: "Validate, then execute",
        detail:
          "Arguments are checked against the schema before the tool runs; invalid calls bounce back as errors the agent can read.",
      },
      {
        title: "Report or stop",
        detail:
          "The agent answers with what the tools returned — or states it could not act. The loop cap ends anything that stalls.",
      },
    ],
    tech: [
      { label: "Loop bound", value: "max 8 tool calls per run" },
      { label: "Tool schemas", value: "JSON Schema, validated on both sides" },
      { label: "Model", value: "NVIDIA-hosted endpoint, OpenAI-compatible" },
      { label: "Streaming", value: "SSE events with resumable sequence numbers" },
    ],
    related: ["governed-agents", "mcp-servers"],
  },
  {
    slug: "mcp-servers",
    kind: "tools",
    kindLabel: "MCP servers",
    title: "MCP servers",
    headline: "Tools you can inspect before you call them.",
    summary:
      "MCP servers designed around readable tool schemas: list the tools, read the contract, fill the generated form, call it.",
    problem:
      "MCP tools get glued onto agents without anyone reading the schema — then the agent reads it for you, badly. When the contract is opaque, debugging a failed call means guessing.",
    approach:
      "Each demo server is deliberately small: one resource domain, typed tools, explicit errors. The explorer generates its input form from the server's own JSON schema, so the UI cannot drift from the contract. Request, response, and timing are all visible after every call.",
    preview: "workbench",
    featured: "split",
    order: 3,
    demo: "mcp",
    howItWorks: [
      {
        title: "Connect to a server",
        detail:
          "Pick a demo MCP server; its connection state and tool list load with descriptions you can actually read.",
      },
      {
        title: "Read the tool's contract",
        detail:
          "Each tool's schema, required fields, and help text are shown before you touch anything.",
      },
      {
        title: "Fill the generated form",
        detail:
          "The input form is generated from the schema, so required fields and types are enforced in the UI, not guessed.",
      },
      {
        title: "Call and inspect",
        detail:
          "Result, request, and schema sit in separate tabs; execution state and timing are explicit. Tool errors are first-class outcomes.",
      },
    ],
    tech: [
      { label: "Contract source", value: "the server's own JSON Schema" },
      { label: "UI generation", value: "schema-driven forms, never hand-copied" },
      { label: "Error design", value: "typed tool errors, disconnect states, empty responses" },
    ],
    related: ["agents", "skills"],
  },
  {
    slug: "multi-agent-systems",
    kind: "orchestration",
    kindLabel: "Multi-agent systems",
    title: "Multi-agent systems",
    headline: "A supervisor that shows its work.",
    summary:
      "Supervisor/worker patterns with a live trace: who delegated what, what came back, and where the budget went.",
    problem:
      "Multi-agent systems fail quietly. A worker returns nonsense, the supervisor absorbs it, and three more steps run on top of the garbage before anyone looks. Without a legible delegation trace, orchestration is unaccountable.",
    approach:
      "One supervisor routes tasks to typed workers over shared state. Every delegation, result, and hand-off is an event with a sequence number — the trace you watch live is the trace you can replay later, event for event.",
    preview: "trace",
    order: 4,
    demo: "multi-agent",
    howItWorks: [
      {
        title: "Give the supervisor a task",
        detail: "One request, stated in plain language, enters the run.",
      },
      {
        title: "It routes to workers",
        detail:
          "The supervisor splits the task and delegates to workers with typed inputs. Each delegation is visible as it happens.",
      },
      {
        title: "Workers execute",
        detail:
          "Workers run their piece — model steps and mock tools — under the same caps as any other demo.",
      },
      {
        title: "Aggregate and persist",
        detail:
          "The supervisor combines results; the full delegation tree is stored so the run can be replayed from the dashboard.",
      },
    ],
    tech: [
      { label: "Pattern", value: "supervisor with typed workers over shared state" },
      { label: "Tracing", value: "per-event sequence numbers, replayable" },
      { label: "Budget", value: "shared token and tool-call caps across the run" },
    ],
    related: ["agents", "governed-agents"],
  },
  {
    slug: "skills",
    kind: "agents",
    kindLabel: "Skills",
    title: "Skills",
    headline: "Instruction bundles you can switch on and off.",
    summary:
      "Reusable instruction bundles run on the same input twice — with and without — so the difference is shown, not claimed.",
    problem:
      "System prompts grow until nobody knows which sentence earns its tokens. Without a side-by-side, 'the prompt needed updating' is folklore repeated until it becomes policy.",
    approach:
      "A skill is a versioned instruction bundle with a declared scope and sample inputs. The demo executes the run twice — once with the skill, once without — and puts the two outputs side by side with a short explanation of what changed.",
    preview: "compare",
    order: 5,
    demo: "skills",
    howItWorks: [
      {
        title: "Pick a skill",
        detail: "Each skill states its scope: what it applies to, and what it deliberately ignores.",
      },
      {
        title: "Run with the skill",
        detail: "The bundle is injected into the run for the sample input.",
      },
      {
        title: "Run without it",
        detail: "The identical input, identical model, no bundle.",
      },
      {
        title: "Compare honestly",
        detail: "Both outputs sit side by side; a short note names what the skill changed.",
      },
    ],
    tech: [
      { label: "Unit", value: "versioned instruction bundle with declared scope" },
      { label: "Evaluation", value: "paired runs on sample inputs" },
      { label: "Output", value: "side-by-side comparison with change notes" },
    ],
    related: ["agents", "mcp-servers"],
  },
  {
    slug: "automations",
    kind: "automation",
    kindLabel: "Automations",
    title: "Automations",
    headline: "Event in, steps out, human at the gate.",
    summary:
      "A simulated trigger starts a real workflow — model steps and mock side effects — with an approval gate before anything consequential.",
    problem:
      "Automations that never pause are just scripts with worse observability. The interesting question isn't whether steps can run; it's who gets to stop them, and whether the answer is visible.",
    approach:
      "Trigger, steps, gate, result — each stage is an event in one trace. The demo fires a fake support-ticket webhook and walks it through triage and drafting with real model calls, then stops at an approval gate before any send. Motion only where a step actually changes state.",
    preview: "workflow",
    order: 6,
    demo: "automations",
    howItWorks: [
      {
        title: "A trigger fires",
        detail: "A simulated 'new support ticket' event starts the workflow.",
      },
      {
        title: "Triage runs",
        detail: "A model step classifies the ticket; the classification is shown as it happens.",
      },
      {
        title: "A draft is written",
        detail: "The response draft is generated and displayed in full.",
      },
      {
        title: "The gate holds",
        detail:
          "Nothing sends until a person approves. The approval reuses the governed-agent decision panel.",
      },
    ],
    tech: [
      { label: "Trigger", value: "simulated event, clearly labelled as such" },
      { label: "Steps", value: "real model calls with visible intermediate output" },
      { label: "Gate", value: "policy-driven, same approval surface as governed agents" },
    ],
    related: ["governed-agents", "multi-agent-systems"],
  },
  {
    slug: "consulting",
    kind: "consulting",
    kindLabel: "Consulting",
    title: "Consulting",
    headline: "Audit, architecture, or a build sprint.",
    summary:
      "Three packages with written scopes: what you get, what it costs, and what it deliberately does not include.",
    problem:
      "Most AI consulting sells hours against a vague outcome. Scopes of work are more honest: a named deliverable, a timeframe, and boundaries everyone agreed to in writing.",
    approach:
      "Every package ships as a document first: outcome, deliverables, timeframe, boundaries. A one-off checkout reserves the slot — test mode in this showcase, so no real money moves — and the booking link appears once the order is recorded.",
    preview: "scopes",
    order: 7,
    demo: null,
    howItWorks: [
      {
        title: "Pick a package",
        detail: "Audit, architecture review, or a build sprint — each with its written scope on the page.",
      },
      {
        title: "Reserve with a one-off checkout",
        detail: "A single payment creates an order; no subscription, no upsells.",
      },
      {
        title: "Book the kickoff",
        detail: "The booking link unlocks once the order is recorded.",
      },
      {
        title: "Work to the scope",
        detail: "Deliverables land inside the stated timeframe or the boundary conversation happens early, not at the invoice.",
      },
    ],
    tech: [
      { label: "Packages", value: "audit · architecture review · build sprint" },
      { label: "Billing", value: "one-off checkout, order record, booking link" },
      { label: "Scope", value: "outcome, deliverables, timeframe, boundaries — in writing" },
    ],
    related: ["governed-agents", "mcp-servers"],
  },
];

export function getSeedOffering(slug: string): Offering | undefined {
  return offerings.find((o) => o.slug === slug);
}
