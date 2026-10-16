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

## Endpoints (M0 skeleton)

- `POST /runs` — starts a run (Ed25519 bearer token required)
- `GET /runs/{id}/events` — SSE stream, resumable via `Last-Event-ID`
- `POST /approvals/{id}` — resolve a pending approval (approved/edited/rejected)

The M0 store is in-memory with a scripted run; M3 persists to
`runtime.runs` / `runtime.run_events` and wires the real demos.

## Tests

```bash
.venv\Scripts\python -m pytest tests -q
```

## Migrations

```bash
.venv\Scripts\python migrate.py    # applies migrations/*.sql, needs DATABASE_URL
```
