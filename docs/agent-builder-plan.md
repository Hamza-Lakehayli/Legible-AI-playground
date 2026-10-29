# Playground builders — implementation plan

Reworks the playground around **two builders** with a chooser as the entry
point, replacing today's "console-first" page. Visited 2026-10-28 with the
owner; decisions below are locked.

Related: docs/Ai showcase Next.js Project Spec.md (§Playground, §Data model,
M7), docs/ai-showcase-design-brief-v2.md (§Agent builder, §Playground state).

## Decisions (locked)

1. **Two builders, one entry.** `/playground` opens on a **chooser**: two
   buttons — *Agent builder* (form card: model, prompt, tools, optional MCPs /
   hooks / skills) and *Workflow builder* (drag-and-drop canvas — the reference
   image: trigger on top, decision diamond with labeled branches, `+` insert
   points on edges). Switching between builders stays possible at any time from
   inside either one.
2. **The governed console becomes the shared run view.** Whatever a builder
   produces is *run* by the same runtime; the console (approval gates, event
   trace, resumable runs) renders the run for both builders.
3. **Runtime-backed from v1.** "Run" extends the FastAPI runtime: agent specs
   execute the governed loop with the author's config; workflow graphs are
   walked node-by-node with the same governance. No client-side simulation.
4. **No database for builder configs.** Deployment target is Vercel Hobby and
   this is a display, not a product: saved agents/workflows live in
   **localStorage** (versioned keys, JSON export/import). The runtime is *not*
   stateless, though — it records runs and events in Postgres and returns 503
   without a reachable `DATABASE_URL`; there is no in-memory fallback. Postgres
   tables for agents/graphs (`runtime.agents`, `runtime.graphs`) stay documented
   here as the upgrade path only.
5. **Canvas first.** The canvas is the missing showpiece. It ships before the
   agent card, using **preloaded template agents** so expert nodes have content
   immediately; the agent card lands next and its outputs become selectable
   agent nodes.
6. **Node vocabulary is LangGraph-aligned.** Canvas node types map 1:1 to
   LangGraph constructs (StateGraph nodes, conditional edges, subgraphs) — what
   you draw is what the runtime walks. The reference image defines the *look and
   interactions* (vertical flow, elbow connectors, labeled branches, `+` edge
   inserts), not the node list.

## Entry point — the chooser

`/playground` renders two large choice cards (plus the "more demos" strip that
exists today beneath it):

- **Agent builder** — "Configure an agent: model, system prompt, tools,
  approval policy, optional MCPs, hooks and skills. Then run it."
- **Workflow builder** — "Draw the flow: agents you built, LLM calls, tools,
  decisions with labeled branches. Then run it."

**Switching is not a route change.** The two builders are views of one page
(client-side switcher; the choice is mirrored to `?builder=agent|workflow` via
`history.replaceState`). A hard route change would fire the site's glitch
transition — too heavy for flipping between builders, so the switcher avoids
`<Link>` on purpose. Drafts are kept per builder (separate store keys), and
switching with unsaved changes asks once ("Keep editing this draft / Switch").

The governed-agent console keeps working — it is simply no longer the landing
view of the page; the agent builder's run panel embeds it.

## Builder 1 — Agent builder (the card)

A single-card form, in brief styling (square corners, mono labels, no fake
liveness):

| Field | Required | Notes |
| --- | --- | --- |
| Name + one-line description | yes | Identifies the agent in workflow node pickers |
| Model | yes | Select from the demo model list the runtime already serves |
| System prompt | yes | Textarea; template variables listed under it |
| Tools | yes | Multi-select from the runtime's mock-tool registry; each tool shows its approval policy chip |
| Approval policy | yes | Per selected tool: always ask / auto-approve. Defaults to "always ask" |
| MCP servers | optional | Selects from the demo MCP list (populates as the MCP explorer lands) |
| Hooks | optional | Pre/post-call hooks from a preset list |
| Skills | optional | Preset skill pack list |

Actions: **Run** (stream the run in the run panel) and **Save** (localStorage),
with validation before run. The card also exposes a **"View as graph"** toggle
that renders the agent's *canonical loop subgraph* (below) read-only — this is
how the card relates to the canvas without the card itself being a canvas.

## Builder 2 — Workflow builder (the canvas)

`@xyflow/react` (as the spec already names it), client-only, with custom node
components styled to the brief. Node set (LangGraph mapping in parens):

| Node | Looks like | LangGraph mapping | v1? |
| --- | --- | --- | --- |
| Start | pill node at top, single per graph | `START` | yes |
| Agent | card node for an agent (preloaded or user-built) | subgraph: the agent's canonical loop | yes |
| LLM call | node with model + prompt template | LLM node | yes |
| Tool | node bound to a mock tool | tool node | yes |
| Decision | diamond, labeled out-edges (`approved` / `rejected` / `default outcome` style, per the image) | conditional edges | yes |
| Sub-workflow | node referencing another saved workflow | subgraph node | v2 |
| End | terminal pill | `END` | yes |
| Wait | bounded delay or manual resume | — | v2 |

**The agent ↔ graph relationship.** Every agent has a canonical loop subgraph
(`prompt → llm → policy gate → tool call if approved / redirect if rejected →
loop`). An Agent node *expands in place* (peek/expand toggle) to show that
subgraph, with the card's fields shown as node config — the "relate the
graph to the flow builder" requirement. Workflows that embed agents therefore
inherit governance without drawing gates by hand; LLM/Tool nodes used directly
get the run's policy (approve-always is the default for every tool call).

**Interactions** (matching the reference image):

- Vertical flow, straight elbow connectors; branch labels sit on the out-edges
  of decisions. The approval-loop template is preloaded on first visit and runs
  with zero edits (spec M7).
- **`+` insert buttons on every edge** open the node picker inline (the image's
  core pattern); the node picker is the same palette used to add nodes to empty
  canvas space.
- Drag to move; drag from a handle to another node to connect; click a label to
  rename a branch; delete via selection. Keyboard: arrow nudges of the
  selection, `Delete`, `Cmd/Ctrl+Z` undo. A **list/outline view** toggle
  renders the same graph as a nested outline with inline forms — the
  accessible, reduced-motion-safe editing path.
- Validation surfaces live: exactly one Start; every node reachable from it;
  at least one End is reachable; every decision out-edge labeled and
  connected; cycles allowed but every run is bounded (walker stops after a step
  budget, surfaced in the trace as "step limit reached").

## Runtime work

The runtime keeps its existing shape: Postgres is still required for run
records and events (`_require_pool()` → 503 without `DATABASE_URL`); there is no
in-memory fallback.

- `POST /runs` accepts a new body shape: `{ input, kind: "agent" | "workflow",
  spec?: AgentSpec, graph?: WorkflowGraph, agents?: Record<string, AgentSpec> }`
  alongside today's demo run. `agents` carries only the specs referenced by
  agent nodes in the graph. Response and auth unchanged
  (`POST /api/playground/token` → bearer).
- New engine module `runtime/app/builder.py`:
  - `agent` → drives the existing governed loop with the spec's prompt/model/
    tools/policy (the governed demo's engine, config-driven).
  - `workflow` → a step walker over the graph: Start → next node → decisions
    pick an out-edge → End. Cycles allowed, step budget enforced.
  - Tool calls go through the **same gateway** regardless of origin, so
    approvals pause and resolve exactly like the governed demo. Model calls use
    the runtime's existing model plumbing from the governed demo (same
    provider/keys or the same canned responder — no new provider work in v1).
- SSE additions (minimal): every event gains optional `node` attribution
  `{ id, label }`; a new `workflow.step` event marks node entry/exit and the
  branch taken. The console renders a "current node" chip and groups the trace
  per node for workflow runs.
- Zod/pydantic mirrors of the two schemas; shared shape in
  `web/lib/builder/schema.ts` (zod) is the source of truth for the client.

**Persistence (v1):** `legible.builder.agents.v1` and `legible.builder.graphs.v1`
in localStorage; JSON export/import buttons on each builder (also the seeding
mechanism for demo setups). Upgrade path (documented, not built): when a real
product is warranted — `runtime.agents` / `runtime.graphs` tables + CRUD behind
the same token, dashboard listing via the read-only role.

## Run view integration

`governed-agent-console.tsx` is refactored: the run plumbing (token fetch, SSE
reader, event reducers) extracts into `components/console/use-run-session.ts`,
the trace into `run-trace.tsx`, and the approval gate into `approval-card.tsx`.
`components/builder/run-panel.tsx` composes them for both builders; the governed
console stays as a thin wrapper over the same parts. Workflow runs add: node
chips, branch-taken labels, and the step-limit state. Existing behaviors survive
untouched: sessionStorage run resume, waiting/failed/expired states, graceful
SSE reconnect via `Last-Event-ID`.

## Deployment shape (Vercel Hobby)

- Next app on Vercel — unchanged; the runtime is reached directly by the
  browser (per the existing ADR note about SSE and time limits).
- The runtime needs one home outside Vercel: local during live demos, or a free
  always-on-ish host (Render/Fly free tier — expect a cold start after sleep;
  the run console must show "runtime starting…" cleanly instead of an error).
- No database for builder configs (localStorage only), but the runtime host
  needs a Postgres instance for run records and events. If the site must stand
  alone without the runtime, the builders still open and edit graphs, and Run
  shows an explicit offline/sign-in state.

## Milestones

| Step | Scope | Done when |
| --- | --- | --- |
| B1 | Chooser page + builder switcher; extract the run plumbing (`use-run-session` / `run-trace` / `approval-card`); console wrapper unchanged | `/playground` opens on two cards; both views reachable with draft preservation; governed demo still runs end-to-end |
| B2 | Canvas MVP: Start/Agent(preloded)/LLM/Tool/Decision/End nodes, edge `+` inserts, branch labels, validation, approval-loop template, Run → walker with node-attributed trace | Drawing & running the preloaded template works; branch taken visible in trace |
| B3 | Agent card: fields → spec runs; saved agents appear in the canvas node picker | An agent built in the card runs, and can be dropped into a workflow and run there |
| B4 | Depth: agent-node expand/peek, sub-workflow nodes, Wait v2, empty/error states (export/import and the outline view landed with B1–B2) | All v1 node types usable; a11y path covers full editing |
| B5 | Deployment polish: runtime hosting notes, cold-start/offline states, final browser pass | Deployed display behaves like local runs |

## Design-brief compliance

- The canvas and card are **functional UI**: no decorative motion, no fake
  typing or counters. Run state is always explicit (Queued/Running/Waiting/
  Completed/Failed/Expired) in text + icon, not color alone.
- Square corners, mono metadata, brand palette; JSON views in the code surface.
- Reduced motion: no canvas spring animations (snap positions), glitch
  transitions skip, list/outline view is the calm fallback.
- `aria-live` for run state; the outline view carries keyboard editing; canvas
  nodes get focusable controls where xyflow exposes them, list view as the
  guaranteed path.

## Tests

- Vitest: zod schema round-trips, graph validation rules, template compiles,
  localStorage store versioning/migration.
- Runtime pytest: walker (linear, decision, branch default, cycle + step
  budget), agent spec run, governance applies to workflow tool calls, SSE
  attribution fields.
- Browser pass (chrome-devtools): author → run → approval → complete, for both
  builders; switch builders with a dirty draft; export/import; reduced-motion
  pass.

## Risks / footguns

- **Do not switch builders with a route change** — it fires the site glitch and
  drops RAF work; use the in-page switcher.
- **xyflow styling bleed**: constrain node styling to the custom components;
  strip xyflow's default chrome so the canvas reads as the brief, not a
  library.
- **Draft loss**: localStorage writes are debounced + validated; import merges
  by id, never overwrites silently.
- **Client-only canvas**: `@xyflow/react` must never render during prerender —
  the shell's server snapshot is the chooser, so the canvas only mounts after a
  builder is chosen (a static import inside the client component is fine)
  — the page shell still renders statically.
- **Runtime cold starts** on free hosting: the console needs a distinct
  "starting" state, not a bare fetch failure.
- **User WIP overlap**: `playground/page.tsx` and `governed-agent-console.tsx`
  are actively edited — B1 restructures them only with the owner's go-ahead at
  that moment.

## Revision - 2026-10-28: single builder v2 (applied)

After building and using the two-builder page, the split was dropped: the
dashboard-then-canvas dance duplicated the entry point, and the agent card
belonged *inside* the canvas anyway. The playground is now one full-screen app
(own route group `(flow)`, no site chrome, minimal header):

- **One builder.** Agent nodes carry their config card inline
  (`NodeConfig.agent`); the standalone agent builder, chooser, and builder
  shell are deleted. `agentId` is gone - the runtime looks specs up by node id
  (`collectAgents`), and bundles are graphs-only (`graphs.v2` stores strip the
  legacy `agents` arrays).
- **Canvas owns the screen.** Minimal header (back chip, borderless name
  input, export/import/save icons), floating `+ Node` / Outline chips, node
  details as a pop-up card (`.panel-in`, Escape/pane-click close), run deck
  docked at the bottom (input + state chip + approval gate + node-attributed
  trace).
- **Drag perf fix.** In-flight drags update a transient positions map; the
  spec (autosave, validation, outline) is touched only when
  `dragging === false`, and node objects are identity-stable via a
  signature-keyed cache so one card re-renders per tick instead of the canvas
  container "refreshing constantly".
- **Drag vanish fix.** Rebuilding pure spec-shaped node objects dropped React
  Flow's `measured` sizes (the builder ignored the `dimensions` changes RF
  emits so the parent script `applyNodeChanges` normally persists them); RF
  then reset `handleBounds` on every adoption and flipped the wrapper to
  `visibility: hidden` mid-drag. Dimension changes are now merged into the
  identity cache and rebuilds spread the previous object forward, so a node
  stays visible and draggable under continuous pointer movement.
- **Lenient drafts.** `agentCardSchema` / `workflowSchema.name` never evict a
  half-typed draft; `validateWorkflow` explains what a run needs instead.
- **Browser-pass notes.** The xyflow default attribution is kept (hiding it is
  a Pro-subscriber courtesy), relocated to the clear top-right corner; the
  inspector anchors at `top-7` to leave room for it. React Flow Controls sit
  under the canvas chips, overridden at (0,4,0) specificity because xyflow's
  stylesheet loads after globals.css and would win equal-specificity ties.
