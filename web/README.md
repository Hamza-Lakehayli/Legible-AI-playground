# Web — Next.js control plane

The web app: marketing pages (SSG + partial prerender), auth (M2), the
governed-agent playground control plane (M3), dashboard (M4), and billing via
Polar sandbox (M6). Server Components by default; data flows through
server-only modules in `lib/data`.

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
    playground/        governed-agent client console; later demos follow
    login/ register/
  api/
    playground/token/  workspace-checked short-lived Ed25519 run token
    auth/
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
- M3 live runs require `NEXT_PUBLIC_RUNTIME_URL` and
  `RUNTIME_TOKEN_PRIVATE_KEY` in `.env.local`; the runtime needs the matching
  public key and NVIDIA API key in `runtime/.env`. Keep the private key out of
  the runtime and browser bundles. The token route signs five-minute,
  workspace-scoped tokens; the browser sends them directly to FastAPI for
  start, SSE, and approval requests.
- Generate a paired Ed25519 key with the installed runtime dependencies:

  ```powershell
  Set-Location runtime
  python -c "import base64; from cryptography.hazmat.primitives import serialization; from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey; k=Ed25519PrivateKey.generate(); p=k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode().replace('\n','\\n'); q=base64.urlsafe_b64encode(k.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode().rstrip('='); print('RUNTIME_TOKEN_PRIVATE_KEY='+p); print('RUNTIME_TOKEN_PUBLIC_KEY='+q)"
  ```

  Put the private key only in `web/.env.local`, the public key in
  `runtime/.env`, and set `NVIDIA_API_KEY` and `NEXT_PUBLIC_RUNTIME_URL`.
