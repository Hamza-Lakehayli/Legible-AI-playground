# AI Showcase Platform

A SaaS-style site presenting AI engineering work — agents, governed agents,
multi-agent systems, MCP servers, skills, automations, and consulting — with
accounts, a free tier, a data-heavy dashboard, and a playground where visitors
run live demos on a free-tier NVIDIA-hosted model.

**Status:** M0 (setup) and M1 (marketing site) complete. See `docs/` for the
full spec and the visual design brief.

## Structure

```
e-commerce/
  web/        Next.js 16 app — control plane (pages, auth, billing, dashboard)
  runtime/    Python FastAPI service — data plane (agents, policies, SSE runs)
  docs/       Project spec + visual design brief (source of truth)
  scripts/    → lives in web/scripts (seed)
```

One Postgres database, two schemas with one writer each: `web` (Next.js) and
`runtime` (FastAPI). The browser talks to Next.js for pages and billing, and
straight to the runtime for streamed runs using a short-lived signed token.

## Prerequisites

- Node 20+ and pnpm 12 (`corepack enable`)
- Python 3.13
- A Postgres database (Neon free tier works)

## Running the web app

```bash
cd web
pnpm install
cp .env.example .env.local    # add DATABASE_URL when ready
pnpm dev                      # http://localhost:3000
```

Database (once `DATABASE_URL` is set):

```bash
pnpm db:generate   # generate drizzle migrations (already generated)
pnpm db:migrate    # create web schema + tables
pnpm db:seed       # seed offerings from lib/content
```

Production build: `pnpm build && pnpm start`.

## Running the runtime

```bash
cd runtime
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # Windows
.venv\Scripts\python -m pytest tests -q         # tests
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/healthz`.
Migrations (once `DATABASE_URL` is set): `.venv\Scripts\python migrate.py`.

## Environment

- Web: copy `web/.env.example` → `web/.env.local` (Postgres, Auth, Polar sandbox keys later).
- Runtime: copy `runtime/.env.example` → `runtime/.env` (model key, token public key).

Secrets never go in `NEXT_PUBLIC_*` variables, in chat, or in git.

## Stack

| Layer | Choice |
| --- | --- |
| Web framework | Next.js 16 (App Router, Cache Components) + TypeScript |
| UI | Tailwind CSS 4, Lucide icons, shadcn-compatible tokens |
| Runtime | Python + FastAPI |
| Model | NVIDIA NIM hosted endpoint (OpenAI-compatible), free tier |
| Database | PostgreSQL (Neon) + Drizzle ORM (web) / asyncpg (runtime) |
| Auth | Auth.js (NextAuth v5), credentials + JWT sessions |
| Billing | Polar (merchant of record), sandbox mode — Stripe is unavailable in Morocco |
| Streaming | Server-Sent Events with resumable sequence numbers |

## Milestones

- [x] **M0** Setup: repo layout, Next.js + Tailwind, FastAPI skeleton, Drizzle + runtime migrations, env validation
- [x] **M1** Marketing site: home, offerings (static + partial prerender), pricing, about, SEO, OG images
- [ ] **M2** Auth and workspace (Auth.js, protected routes, tenant-scoped data layer)
- [ ] **M3** Runtime + governed-agent demo (token minting, SSE with resume, approvals)
- [ ] **M4** Dashboard (overview, runs, run detail, approvals)
- [ ] **M5** Quotas and replay mode
- [ ] **M6** Billing (Polar sandbox subscriptions, webhooks, entitlements)
- [ ] **M7** Remaining demos (MCP explorer, agent builder, multi-agent, skills, automations)
- [ ] **M8** Polish, accessibility, deploy, demo script
