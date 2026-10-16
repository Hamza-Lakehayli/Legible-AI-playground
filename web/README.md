# Web — Next.js control plane

The web app: marketing pages (SSG + partial prerender), auth (M2), dashboard
(M4), and billing via Polar sandbox (M6). Server Components by default; data
flows through server-only modules in `lib/data`.

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # production build (Cache Components enabled)
pnpm lint

pnpm db:generate    # drizzle-kit generate (after editing lib/db/schema.ts)
pnpm db:migrate     # apply migrations (needs DATABASE_URL)
pnpm db:seed        # seed offerings from lib/content (needs DATABASE_URL)
```

## Layout

```
app/
  (marketing)/       public pages — static/partially prerendered
    page.tsx           home
    offerings/         index + [slug] (generateStaticParams + tags)
    pricing/           plans + current-plan island in Suspense
    about/
    playground/        stub until M3
    login/ register/   stubs until M2
  api/               (M3: playground/token, M6: webhooks/polar)
  dashboard/         (M4)
lib/
  data/              server-only queries ('use cache' + cacheTag)
  db/                Drizzle schema (pgSchema "web") + lazy client
  content/           seed content for offerings
  env.ts             zod-validated environment
  cache-tags.ts      tag design (ADR 7)
components/
  ui/                buttons, badges, layout primitives (brief §5)
  marketing/         header, footer, console preview, home sections
scripts/
  seed.ts
drizzle/             generated migrations
```

## Notes

- `cacheComponents: true` — cached data must be declared with `use cache`
  and an explicit `cacheLife`; `await params` stays inside `<Suspense>`.
- With no `DATABASE_URL`, `lib/data` falls back to seed content so the site
  renders before Postgres exists. Set the URL, then run migrate + seed.
- Design tokens live in `app/globals.css` and mirror
  `docs/ai-showcase-design-brief-v2.md`.
