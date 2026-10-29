# Runtime — FastAPI data plane

Runs agents, evaluates tool policies, and streams run events over SSE.
Owns the `runtime` Postgres schema; never reads `web` (spec: two schemas,
one writer each).

## Run

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt      # Windows
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Health: `GET /healthz`

## Endpoints (M3 governed-agent slice)

- `POST /runs` — starts a governed-agent run; requires a signed Ed25519 bearer token and JSON `{ "input": "..." }`
- `GET /runs/{id}/events` — persisted SSE stream, resumable with `Last-Event-ID`
- `POST /approvals/{id}` — resolve a workspace-scoped approval (`approved`, `edited` with validated arguments, or `rejected`)

The runtime persists runs, ordered events, and approval state in the `runtime`
schema. The governed agent calls the configured NVIDIA-compatible chat
completion endpoint and can invoke only the seeded `orders.lookup` and
`orders.refund` mock tools. Refunds always pause for a human decision; tools
never access external systems.
The seeded order's note contains a prompt-injection attempt; tool output is
treated as untrusted, and the refund policy still requires human approval.
If the runtime process restarts while a run is queued, running, or waiting
for approval, startup marks it failed and expires its pending approvals
rather than risk repeating a tool action without the original model context.

## M3 configuration

- `DATABASE_URL` — runtime-role Postgres connection string; apply migrations with `python migrate.py`.
- `RUNTIME_TOKEN_PUBLIC_KEY` — base64url-encoded raw Ed25519 public key. The private key belongs only in the web app.
- `NVIDIA_API_KEY` — model credential, held only by this service.
- `NVIDIA_BASE_URL` / `NVIDIA_MODEL` — optional endpoint and model overrides.
- `ALLOWED_ORIGIN` — exact browser origin allowed by CORS.

The web app needs the corresponding `RUNTIME_TOKEN_PRIVATE_KEY` PEM and
`NEXT_PUBLIC_RUNTIME_URL`; see `web/README.md`. Runs require all runtime
dependencies and credentials above. Missing database/model configuration
produces explicit errors rather than a simulated live response.

## Tests

```bash
.venv\Scripts\python -m pytest tests -q
```

## Migrations

```bash
.venv\Scripts\python migrate.py    # applies migrations/*.sql, needs DATABASE_URL
```
## Model-request resilience

`MODEL_REQUEST_BUDGET_SECONDS` defaults to 60 and bounds the combined wall time
of a primary request and at most one fallback attempt. Requests are cancelled on
expiry; tool execution is never retried by this mechanism. Human approval waits
are outside this request budget (existing run/approval limits still apply).

`FALLBACK_MODEL` is optional and unset by default. Configure only a model supporting
the same tools; a smaller model may behave differently. Only 429, 5xx, network
errors and request timeouts are eligible, and only with budget remaining. Trace
events record attempted models, safe failure reasons and the serving model.

The web run dock checks `/healthz` before minting a token. An unreachable service
may be offline, misconfigured, or cold-starting; the UI does not guess which.
Manual connection retries do not create runs. If a run-creation response is lost,
check Dashboard → Runs before starting again; automatic creation retries are
deliberately disabled to avoid duplicate side effects.
