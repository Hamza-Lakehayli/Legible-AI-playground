# AI Showcase Platform: Next.js Project Spec

This showcase is a SaaS-style site presenting your AI work (agents, governed agents, multi-agent systems, MCPs, skills, automations, consulting) with accounts, a free tier, a dashboard, and a playground where visitors run live demos on a free-tier NVIDIA-hosted model.

## At a glance

&#91;embedded content: architecture · 2 services, 2 schemas, 2 external APIs\]

The browser talks to Next.js for pages and billing, and straight to the runtime for streamed runs using a short-lived signed token. The dashboard reads run data from the runtime schema through a read-only role.

## Goal and scope

The goal is to prove, in one deployed product, that you can design and ship a full-stack AI platform: marketing pages, auth, billing, a data-heavy dashboard, and a live playground backed by a separate agent runtime. It is a showcase, not a business: billing runs on Polar (a merchant of record available to Moroccan sellers) in sandbox mode and nothing is sold.

**What it must demonstrate**

- The right rendering mode per route: SSG/ISR for marketing, SSR for the dashboard, streaming for the playground.
- Server Components by default, Client Components only where interaction needs them (playground console, approval cards, charts).
- Server Actions for mutations, Route Handlers for streaming and webhooks.
- A clean control plane / data plane split, joined by a short-lived signed token.
- Polar sandbox subscriptions that change what the playground allows.
- A human-in-the-loop approval flow that visitors can click through for real.

**In scope (v1)**

- Public site: home, one page per offering, pricing, about.
- Auth, a personal workspace, Free and Pro plans (Polar sandbox), consulting packages as one-off test payments.
- Six playground demos. The **agent builder is the primary surface**: the
  playground opens straight onto a full-graphic, drag-and-drop canvas where
  visitors draw the agent loop with as little friction as possible —
  `prompt → llm → gateway → tool call (if approved) / redirect (if rejected)`.
  The governed agent and MCP explorer demos stay in depth; multi-agent,
  skills, and automations remain thin.
- Dashboard: usage, runs, approvals, billing.
- Quotas and rate limits that protect the shared free model key.

**Stretch**

- Team workspaces and invitations, API keys, public replay links for a run, bring-your-own-key, email notifications.

**Out of scope**

- Real customers or payments, hosting visitors' own agents, an admin back-office (that is the ERP project).

## Offerings and plans

Every thing you build becomes an offering page with a matching playground demo, and plans decide how much of the playground a visitor gets.

| Offering | What the page shows | Playground demo |
| --- | --- | --- |
| Agents | Tool-using single agents, what they can do | Chat with an agent that calls mock tools |
| Governed agents | Approval policies, audit trail, risk levels | Risky tool calls pause until the visitor approves, edits or rejects |
| Multi-agent systems | Supervisor and worker patterns | Live trace of a supervisor delegating to workers |
| MCP servers | Catalog of your MCP servers and their tools | MCP explorer: list tools, fill a generated form, call one |
| Skills | Reusable instruction bundles | Pick a skill, run it on sample input, compare with and without |
| Automations | Trigger, steps, approval gate | Simulated event starts a workflow with real model steps |
| Consulting | Packages: audit, architecture, build sprint | No demo; one-off test checkout and a booking link |

| Plan | Price (Polar sandbox) | Runs per day | Demos | Run history |
| --- | --- | --- | --- | --- |
| Guest (no account) | none | 3 | Governed agent only | none |
| Free | 0 | 15 | All | 7 days |
| Pro | 9 USD per month | 60 | All, priority queue | 90 days |
| Consulting package | one-off, for example 490 USD | not applicable | not applicable | order record |

The run limits are starting values: tune them after measuring the real rate limit of the free model endpoint. The point of the plans is that subscription status feeds entitlements, entitlements feed quotas, and the dashboard shows all three.

## Tech stack

Two deployables: a Next.js web app (control plane) and a Python runtime (data plane) that runs the agents.

| Layer | Choice | Why |
| --- | --- | --- |
| Web framework | Next.js (App Router) + TypeScript | The skill this project exists to build |
| UI | Tailwind CSS + shadcn/ui, Recharts, TanStack Table | Fast, accessible, good for dashboards |
| Runtime service | Python + FastAPI, reusing your existing agent and approval code | Keeps the AI work in the language and frameworks you already use |
| Model | NVIDIA NIM hosted endpoint (OpenAI-compatible), free tier | The key lives only in the runtime; verify current limits before setting quotas |
| Database | PostgreSQL (Neon free tier) + Drizzle ORM | One database, two schemas: `web` and `runtime` |
| Auth | Auth.js (NextAuth v5): credentials + GitHub | Standard Next.js auth, JWT sessions |
| Billing | Polar (merchant of record): sandbox subscriptions, hosted Checkout, Customer Portal, signed webhooks | Stripe is unavailable in Morocco; Polar provides the same subscription lifecycle in sandbox mode without real money |
| Rate limiting | Upstash Redis free tier, or Postgres counters | Shared counters across serverless instances |
| Streaming | Server-Sent Events from the runtime, resumable with `Last-Event-ID` | Simple, proxy-friendly, survives reconnects |
| Validation | Zod (web), Pydantic (runtime) | Typed boundaries on both sides |
| Testing | Vitest, Playwright, pytest | A few high-value tests per layer |
| Hosting | Vercel (web) + a small container host for the runtime (Fly.io, Render or Railway) | Check current free options; watch cold starts on the runtime |

Notes:

- The model key never reaches the browser or the web app. Only the runtime holds it.
- Next.js caching APIs changed between versions 14, 15 and 16. Read the caching docs for the version you install and record the choice in an ADR.
- Credentials login in Auth.js requires JWT sessions rather than database sessions.
- Money is stored as integer minor units, in a currency Polar supports (USD or EUR).

## Routes and rendering

Marketing pages are static, everything personal is dynamic, and the playground streams.

| Route | Rendering | Data | Notes |
| --- | --- | --- | --- |
| `/` | Static + ISR | Offerings, featured demo | Tag `offerings` |
| `/offerings`, `/offerings/[slug]` | SSG + ISR via `generateStaticParams` | Offerings content (MDX or DB) | Tag `offering:{slug}`, JSON-LD, Open Graph image |
| `/pricing` | Static | Plans | The current-plan button is a small dynamic island inside Suspense |
| `/playground` | Dynamic | Demo list, entitlements | Entitlements stream in; shell renders at once |
| `/playground/[demo]` | Dynamic | Run token, remaining quota | Client console consumes the runtime SSE stream |
| `/dashboard` | Dynamic, protected | Usage, plan, recent runs | One Suspense boundary per widget |
| `/dashboard/runs`, `/dashboard/runs/[id]` | Dynamic, protected | Runs and stored events | Filters in the URL; detail page replays the event log |
| `/dashboard/approvals` | Dynamic, protected | Pending and resolved approvals | Resolve through a Server Action |
| `/dashboard/billing` | Dynamic, protected | Subscription, invoices | Links to the Polar Customer Portal route handler |
| `/checkout/consulting/[package]` | Dynamic | Package | Server Action creates a hosted Polar Checkout |
| `/login`, `/register` | Dynamic |  |  |
| `/api/playground/token` | Route Handler | Entitlements, quota | Checks the quota and mints the short-lived runtime token |
| `/api/webhooks/polar` | Route Handler | Polar events | Raw body, Standard Webhooks signature check, idempotent |
| `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` | Generated | Offerings |  |

**Principles**

1. Server Components read data through a server-only data layer (`lib/data`), never through internal API calls.
2. Client Components are small islands: playground console, approval card, charts, filters.
3. Every write is a Server Action that validates with Zod, checks the session, and scopes the query to the workspace.
4. The browser talks to the runtime directly over SSE with a short-lived token, so Vercel function time limits never cut a long agent run. If you prefer one public origin, proxy the stream through a Route Handler and record that trade-off in an ADR.

## Playground

The playground is a set of sandboxed demos where every tool is a mock with no real side effects, so visitors can try risky actions safely.

| Demo | What the visitor does | What it proves | Depth |
| --- | --- | --- | --- |
| Governed agent | Asks the agent to act (refund an order, email a customer, delete a record); risky tool calls pause and the visitor approves, edits the arguments, or rejects | Approval policies, audit trail, resumable runs | In depth |
| MCP explorer | Picks one of your demo MCP servers, sees its tools, fills a form generated from the tool's JSON schema, calls it | MCP server design, schema-driven UI | In depth |
| Agent builder (primary) | Draws the agent loop on a drag-and-drop canvas — prompt → llm → gateway → tool call if approved, redirect if rejected — starting from a preloaded template, then runs it | Graph authoring compiled to LangGraph; saved configurations | Primary |
| Multi-agent run | Gives a task and watches a supervisor delegate to workers on a live trace | Orchestration and tracing | Thin |
| Skills | Picks a skill, runs it on sample text, switches it off to compare | Reusable instruction bundles | Thin |
| Automations | Fires a simulated event (new support ticket); steps run with real model calls and stop at an approval gate | Trigger, steps, gate | Thin |

**Agent builder demo (the playground's primary surface)**

The playground opens straight onto the builder canvas — no demo picker in
front of it. The visitor sees a canvas with a preloaded template of the core
agent loop — `prompt → llm → gateway → tool call (if approved) / redirect (if
rejected)` — and can Run it with zero edits, or drag nodes from a palette to
redraw the logic: a palette of node types (prompt, model, gateway/policy, tool,
redirect, output), thin connector edges, and a config inspector per node. What
it proves: the runtime is a real graph engine, not a scripted chat. The
visitor shouldn't have to think much: the template runs first, examples are
one click away, and every node speaks plain words ("gateway: approve or
redirect") rather than framework jargon.

- Each node type maps to a LangGraph construct in the runtime (see ADR 8). The canvas serializes nodes and edges to JSON; the web app validates the shape with Zod before saving.
- Node types are curated: only mock tools from the sandbox registry, no visitor code, a cap on nodes per graph (start with 12), and cycle detection. All per-run caps still apply.
- A default supervisor/workers template is preloaded, so "Run" works with zero edits and the demo doubles as a guided multi-agent experience.
- Logged-in visitors save graphs to `saved_configs` (workspace-scoped, Server Action validated with Zod) and reload them later.
- Execution uses the same lifecycle as every other demo: token, SSE events, approval pauses at approval-gate nodes; the active node and edge light up on the canvas while the run streams.

**Run lifecycle**

1. The visitor starts a run. The browser calls `/api/playground/token`.
2. Next.js checks session, plan and quota, then mints a signed token (a few minutes of validity) carrying user id, workspace id, demo, and plan limits.
3. The browser calls the runtime `POST /runs` with that token. The runtime verifies the signature, creates the run, and starts the agent.
4. The browser opens `GET /runs/{id}/events` (SSE). The runtime stores every event in `runtime.run_events` with an increasing sequence number, so a dropped connection resumes from `Last-Event-ID`.
5. When a tool call needs approval, the runtime persists the run state, emits `approval.required`, and sets the run to `waiting`. No connection and no model call stays open while a human decides.
6. The visitor approves, edits or rejects through `POST /approvals/{id}`. The runtime resumes the run and the stream continues.
7. The run ends with `run.completed` or `run.failed`, usage counters update, and the dashboard picks it up from the database.

**Event types**

| Event | Emitted when | Key payload |
| --- | --- | --- |
| `run.started` | Run accepted | Run id, demo, model |
| `message.delta` | Model streams text | Text chunk |
| `tool.requested` | Agent wants a tool | Tool, arguments, risk level |
| `approval.required` | Policy says a human decides | Approval id, tool, arguments, expiry |
| `approval.resolved` | Visitor decides | Decision, edited arguments |
| `tool.completed` | Mock tool returns | Result summary, duration |
| `run.completed` | Run finishes | Token totals, duration |
| `run.failed` | Error, quota or rate limit | Code, message |

Every event also carries run id, sequence number and timestamp.

**Approval rules**

- Each tool has a policy: allow, ask or deny, plus a risk level (low, medium, high). The policy layer decides, never the model.
- An approval expires after a fixed time (start with 10 minutes). The run is then marked `expired` and nothing further is spent.
- Edited arguments are re-validated against the tool's schema before the tool runs.
- Every decision is written to `approvals` with who decided and when.

**Sandbox and abuse limits**

- Tools are mocks or read-only over seeded data. There is no outbound network access from tools and no URL supplied by a visitor is ever fetched.
- Caps per run: input length, output tokens, tool calls (start with 8), and total duration.
- Treat tool results and seeded documents as untrusted. Include a seeded document that tries to talk the agent into approving its own action, and show that the policy layer blocks it. It is a good demo of governance.
- Show a notice: demo data only, do not enter personal information. Delete runs after the plan's history window.

## Free model budget

The free NVIDIA endpoint is one shared resource, so the platform must meter, queue and degrade gracefully, or the first busy hour breaks the demo. Check the endpoint's current rate limits and credit policy before fixing any numbers; free tiers change.

| Layer | Mechanism | What it protects |
| --- | --- | --- |
| Daily quota | Counter per user (hashed IP plus cookie for guests) in Redis or Postgres | One visitor burning the budget |
| Per-run caps | Max tool calls, output tokens and duration | Runaway agent loops |
| Global limiter | Token bucket in the runtime, sized below the provider's limit | Provider 429 errors |
| Queue and backpressure | Short queue; when full, a clear busy state with an estimated wait | Traffic spikes |
| Response cache | Cache the scripted sample tasks by prompt | Reviewers clicking the same demo repeatedly |
| Replay mode | Pre-recorded runs of each demo replay from stored events | The demo never looks broken |
| Model fallback | Optional second model id on 429 or 5xx | Single-model outages |

**Behaviors to implement**

- Show remaining quota before a run starts, decrement at run start, refund if the run fails before the first model call.
- On a provider 429, retry with exponential backoff and jitter (at most 2 retries), then fall back to replay.
- A "Try a sample run" button needs no account and always works through replay, clearly labelled as a recorded run. Live runs require login.
- Log runs per hour, 429 rate and queue depth so you can tune the limits from real data.

**Acceptance:** with the model endpoint blocked or returning 429, every demo still works in replay mode and says so on screen.

## Billing and entitlements

Stripe is not available to Moroccan sellers, so billing runs on **Polar** (merchant of record) in **sandbox mode**: nothing real is sold, sandbox checkouts accept Stripe-style test cards, and Polar provides the same building blocks — hosted Checkout, Customer Portal, signed webhooks, subscriptions. Polar is the source of truth for subscription state: the database mirrors it through webhooks, and entitlements are derived from that mirror. The provider sits behind one module (`lib/polar.ts`) so it can be swapped without touching pages.

1. The Upgrade button calls a Server Action that creates a hosted Polar Checkout for the Pro product price (`polar.checkouts.create`), with the workspace id in checkout metadata. The Polar customer is created with the checkout and linked to the workspace when it completes.
2. Polar returns the visitor to `/dashboard/billing?checkout_id=...`. Show a processing state until the webhook has landed.
3. The webhook upserts the `subscriptions` row: status, product price id, current period end, cancel-at-period-end.
4. One server function, `getEntitlements(workspaceId)`, maps plan and status to limits (runs per day, demos, history days).
5. Upgrade, downgrade and cancel go through the Polar Customer Portal: a route handler built on the `@polar-sh/nextjs` `CustomerPortal` adapter resolves the workspace's customer id and redirects.

| Polar event | Action |
| --- | --- |
| `checkout.updated` (status `succeeded`) | Link the customer to the workspace; for a consulting package, mark the order paid |
| `subscription.created`, `subscription.updated`, `subscription.active` | Upsert the subscription row (one handler; store the status verbatim) |
| `subscription.canceled`, `subscription.revoked` | Mark canceled; entitlements fall back to Free |
| `order.created` | Store the invoice/order record, extend the period |
| `subscription.updated` with status `past_due` | Mark past due; apply Free limits and show a banner |

**Webhook rules**

- Read the raw body with `await req.text()` and verify it with `validateEvent` from `@polar-sh/sdk/webhooks` (Standard Webhooks HMAC with `POLAR_WEBHOOK_SECRET`). Reject anything that fails with 403.
- Insert the Polar event id into `billing_events` first. If it already exists, return 200 and do nothing.
- Events can arrive out of order. Upsert from the object's current state, or re-fetch the subscription from the Polar API, rather than trusting event order.
- After any change, revalidate the tag `entitlements:{workspaceId}`.
- Forward events locally with the Polar CLI: `polar listen http://localhost:3000/api/webhooks/polar`.

**Entitlements**

- The runtime never reads billing tables. It trusts only the limits inside the signed token that `getEntitlements` produced.
- Consulting packages use one-off Checkout (a one-time-purchase product price) and an `orders` row; the success page shows the booking link once the order is paid.

**Acceptance:** a sandbox checkout with the test card `4242 4242 4242 4242` upgrades the workspace and raises the daily run limit within seconds; cancelling in the portal lowers it again; replaying the same webhook twice changes nothing; a forged request returns 403.

## Dashboard

The dashboard shows everything a visitor has done and paid for in one place, and it is where server rendering, Suspense streaming and Server Actions get exercised hardest.

| Page | What it shows | Rendering notes |
| --- | --- | --- |
| Overview | Plan, quota left today, runs per day over the last 14 days, pending approvals, last 5 runs | Shell renders at once; each widget streams inside its own Suspense boundary; the chart is a client island |
| Runs | Filterable, paginated table by demo, status and date | Filters live in the URL and are applied in the query, not in the browser |
| Run detail | Event timeline, tool calls, approvals, token and duration totals, replay | Reads stored events; the replay control is a client component |
| Approvals | Pending items with approve, edit and reject, plus history | A Server Action resolves the approval and revalidates the page |
| Billing | Plan, invoices, consulting orders, portal button | Polar data fetched on the server and cached briefly |
| Saved graphs | Agent graphs saved from the builder: nodes, edges, node config | CRUD through Server Actions validated with Zod |
| Settings (stretch) | Profile, workspace name, data export, delete account | Server Actions |

**Rules**

- Never scan `run_events` to build charts. The runtime updates a `usage_daily` rollup when a run ends, and the overview reads only that.
- Every query is scoped to the current workspace, and the run detail page also checks that the run belongs to it.
- Empty, loading and error states are designed for every widget, not added at the end.

**Acceptance:** a new user sees a useful empty state, a user with history sees the overview paint before the slowest widget finishes, and a user cannot open another workspace's run by guessing its URL.

## Data model

One Postgres database, two schemas with one writer each: the web app owns `web`, the runtime owns `runtime`. The web app reads `runtime` through a read-only role, and the runtime never reads `web`.

| Schema | Table | Key columns | Written by |
| --- | --- | --- | --- |
| `web` | `users` | id, email, password\_hash (nullable), role | Web app |
| `web` | `accounts` | Auth.js OAuth links | Web app |
| `web` | `workspaces` | id, name, owner\_id, polar\_customer\_id | Web app |
| `web` | `subscriptions` | workspace\_id, polar\_subscription\_id, plan, status, current\_period\_end, cancel\_at\_period\_end | Polar webhook |
| `web` | `orders` | id, workspace\_id, package, amount\_cents, currency, status, polar\_checkout\_id (unique) | Checkout action, webhook |
| `web` | `billing_events` | id (Polar event id, primary key), provider, type, processed\_at | Polar webhook |
| `web` | `offerings` | slug, kind, title, summary, content, published | Seed script |
| `web` | `memberships` (stretch) | workspace\_id, user\_id, role | Web app |
| `web` | `saved_configs` | workspace\_id, demo, name, graph (jsonb) | Web app |
| `runtime` | `runs` | id, workspace\_id, user\_id, demo, status, model, tokens\_in, tokens\_out, started\_at, ended\_at | Runtime |
| `runtime` | `run_events` | run\_id, seq, type, payload (jsonb), created\_at; primary key (run\_id, seq) | Runtime |
| `runtime` | `approvals` | id, run\_id, tool, arguments (jsonb), risk, status, decided\_by, decided\_at, expires\_at | Runtime |
| `runtime` | `usage_daily` | workspace\_id, day, runs, tokens | Runtime rollup |
| `runtime` | `tool_policies` | demo, tool, policy, risk | Seed script |
| `runtime` | `recorded_runs` | demo, scenario, events (jsonb) | Seed script |

**Conventions**

- UUID primary keys, `created_at` and `updated_at` everywhere, money as integer minor units.
- Run statuses: queued, running, waiting, completed, failed, expired, cancelled. Approval statuses: pending, approved, edited, rejected, expired.
- Runtime tables store user and workspace ids copied from the token, with no foreign keys into `web`, so the two services stay decoupled.
- Indexes: `run_events (run_id, seq)`, `runs (workspace_id, started_at desc)`, `approvals (workspace_id, status)`, unique `offerings.slug`.

## Auth and security

The two services trust each other only through a signed token, and every query is scoped to a workspace.

- **Accounts:** email and password (argon2 or bcrypt) with JWT sessions, and a personal workspace created at registration. GitHub login stays behind a flag until an OAuth app exists; the `accounts` table is ready for it.
- **Tenancy:** every row carries a workspace id. Functions in `lib/data` take the workspace id from the session, never from the URL or request body. Test that a request for another workspace's run returns 404.
- **Runtime token:** signed with an asymmetric key so the runtime can verify but not mint. Claims: user id, workspace id, demo, plan limits, expiry (a few minutes), and a unique id. The runtime checks it on run start, on the event stream and on approvals, and confirms the run belongs to the token's workspace.
- **CORS:** the runtime accepts requests only from the web app's origin.
- **Server Actions are public endpoints:** each one validates input with Zod and re-checks the session itself, never relying on the page that rendered it.
- **Secrets:** validate environment variables at startup, never put a secret in a `NEXT_PUBLIC_` variable, keep the model key only in the runtime and the webhook secret only in the web app.
- **Abuse:** rate limit login, token minting and run start; tie guest runs to a hashed IP plus cookie; add a CAPTCHA only if abuse appears.
- **Cookies:** httpOnly, secure, sameSite.
- **Privacy:** show the demo-data notice, delete runs after the plan's history window, and offer data export and account deletion as stretch.

## Project structure

One repository with two apps, so the architecture is visible from the folder tree.

```
showcase/
  web/                        # Next.js app (control plane)
    app/
      (marketing)/
        page.tsx
        offerings/[slug]/page.tsx
        pricing/page.tsx
      (auth)/
        login/page.tsx
        register/page.tsx
      playground/
        page.tsx
        [demo]/page.tsx
      dashboard/
        page.tsx
        runs/page.tsx
        runs/[id]/page.tsx
        approvals/page.tsx
        billing/page.tsx
      checkout/consulting/[package]/page.tsx
      api/
        playground/token/route.ts
        webhooks/polar/route.ts
      sitemap.ts
      robots.ts
    components/
      ui/                     # shadcn
      playground/             # console, approval card, event timeline, builder canvas
      dashboard/
      marketing/
    lib/
      db/schema.ts            # web schema (Drizzle)
      db/runtime-read.ts      # read-only access to the runtime schema
      data/                   # server-only queries
      actions/                # Server Actions
      auth.ts
      polar.ts
      entitlements.ts
      runtime-token.ts
      cache-tags.ts
    drizzle/
    tests/
  runtime/                    # FastAPI service (data plane)
    app/
      main.py
      auth.py                 # token verification
      runs.py                 # run lifecycle and SSE
      approvals.py
      policies.py
      limits.py               # quota, rate limit, queue
      model.py                # NVIDIA client and fallback
      demos/
        governed_agent.py
        mcp_explorer.py
        agent_builder.py
        multi_agent.py
        skills.py
        automations.py
      tools/                  # mock tools
      mcp_servers/            # your demo MCP servers
      db.py
    migrations/
    tests/
  scripts/
    seed.ts
    record_runs.py            # records demo runs for replay mode
  docs/
    adr/
    architecture.md
```

Mark data-access modules with `server-only` so they cannot be imported into Client Components by accident.

## Milestones

The plan is about 45 working days, roughly 7 to 10 weeks at a part-time pace. The riskiest part, the runtime with resumable approvals, comes third so a problem shows up early. If time runs short, cut M7 down to two demos.

| Milestone | Scope | Days | Done when |
| --- | --- | --- | --- |
| M0 Setup | Monorepo, Next.js with Tailwind and shadcn, FastAPI skeleton, Neon, Drizzle and runtime migrations, env validation, lint in CI | 2 | Both apps run locally against the same database |
| M1 Marketing site | Home, offering pages with ISR and tags, pricing, SEO, Open Graph images | 4 | Production build lists static and ISR routes; editing an offering updates without a redeploy |
| M2 Auth and workspace | Auth.js, personal workspace, protected routes, tenant-scoped data layer | 3 | Cross-tenant access test passes |
| M3 Runtime and first demo | Token minting, runs, SSE with resume, governed agent with approval cards, mock tools, policies | 6 | A visitor starts a run, sees it pause, approves, edits or rejects, and sees it finish; a refresh mid-run resumes |
| M4 Dashboard | Overview, runs, run detail with replay, approvals page, `usage_daily` rollup | 5 | Overview numbers match the runs table; run detail replays events |
| M5 Quotas and replay | Daily quota, global limiter, queue, response cache, replay mode, guest sample run | 3 | With the model blocked, demos work in replay mode and say so |
| M6 Billing | Polar subscriptions, Customer Portal, webhooks, entitlements, consulting checkout and orders | 5 | Sandbox checkout raises limits, cancel lowers them, a replayed webhook is a no-op |
| M7 More demos | Agent builder (primary: canvas-first, preloaded approval-loop template that runs with zero edits, palette, graph validation, saved graphs), MCP explorer (in depth), multi-agent, skills, automations (thin) | 13 | All six demos open from the playground and appear in the dashboard |
| M8 Polish and ship | Accessibility pass, error pages, auth rate limits, Playwright flows, deploy both services, README, ADRs, demo script | 5 | Deployed, and a stranger can try a sample run without an account |

**Stretch (M9):** team workspaces and invitations, API keys, public replay links, bring-your-own-key.

## Dev environment notes

- On Windows, WSL2 gives the smoothest setup for Node and the Python runtime, but native Windows works. One root script should start both apps together.
- In M0, check early that the NVIDIA endpoint, Polar and Neon are reachable from your network. If a restrictive network or proxy blocks one of them, set the proxy variables for both Node and Python, and set `NODE_EXTRA_CA_CERTS` and `REQUESTS_CA_BUNDLE` if TLS inspection breaks requests.
- The Polar CLI forwards webhooks locally: `polar listen http://localhost:3000/api/webhooks/polar`. If your network blocks it, replay saved event payloads against the handler with a locally computed Standard Webhooks signature. Build the rest of billing normally.
- If Docker is restricted, skip it: Neon for Postgres and two native processes are enough.

**Environment variables**

- Web: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, GitHub client id and secret (optional, deferred), `POLAR_ACCESS_TOKEN` (sandbox), `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER=sandbox`, `POLAR_PRODUCT_PRO_PRICE_ID`, `POLAR_PRODUCT_CONSULTING_PRICE_IDS` (JSON map), `RUNTIME_TOKEN_PRIVATE_KEY`, Redis URL and token, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_RUNTIME_URL`.
- Runtime: `DATABASE_URL` (runtime role), `RUNTIME_TOKEN_PUBLIC_KEY`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `FALLBACK_MODEL`, `REDIS_URL`, `ALLOWED_ORIGIN`.

## Definition of done

- The web app builds for production and the runtime test suite passes.
- A stranger can open the site, run a sample demo without an account, then register, run each demo live within quota, approve and reject actions, find the runs in the dashboard, upgrade through a Polar sandbox checkout (test card `4242 4242 4242 4242`), and see their limits change.
- Tests cover tenant isolation, webhook signature and idempotency, token checks (expired, wrong workspace, wrong demo), quota enforcement, and approval expiry.
- Both services are deployed publicly, with a short demo script (test card number, sample prompts).
- The README has a short GIF, the architecture diagram, the rendering table, and links to the ADRs.

**ADRs to write**

1. Control plane and data plane as two services.
2. Browser-to-runtime SSE with a signed token, versus proxying through Next.js.
3. Pausing a run by persisting its state instead of holding a connection.
4. Quotas, replay and graceful degradation for a shared free model.
5. Polar webhooks as the source of truth, with derived entitlements (Stripe is unavailable in Morocco; Polar is the merchant of record and the swap is isolated in `lib/polar.ts`).
6. Two schemas with one writer each.
7. Caching strategy and tag design.
8. Agent builder: visitor-authored graphs compile to LangGraph; a curated node palette keeps the sandbox safe.
9. @xyflow/react as the builder canvas, kept a client island inside the Server Component playground.

## Handoff to the ERP project

The next project, the ERP-style back-office, administers this system: offerings, plans, consulting orders, runs, and tool policies. Prepare for it now:

- Keep `role` on users and order status transitions in one module.
- Make offering and policy writes go through functions in `lib/data` that also revalidate the right tags.
- Emit domain events (for example `order.paid`, `run.completed`) from one place so the ERP can consume them later.
- Keep the schema in a folder or package that a second Next.js app can import.
