-- Runtime tables (spec: data model). Written by the runtime only.

CREATE TABLE IF NOT EXISTS runtime.runs (
    id            TEXT PRIMARY KEY,
    workspace_id  UUID NOT NULL,
    user_id       UUID NOT NULL,
    demo          TEXT NOT NULL,
    status        TEXT NOT NULL, -- queued|running|waiting|completed|failed|expired|cancelled
    model         TEXT,
    tokens_in     INTEGER NOT NULL DEFAULT 0,
    tokens_out    INTEGER NOT NULL DEFAULT 0,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS runs_workspace_started_idx ON runtime.runs (workspace_id, started_at DESC);

CREATE TABLE IF NOT EXISTS runtime.run_events (
    run_id     TEXT NOT NULL REFERENCES runtime.runs(id) ON DELETE CASCADE,
    seq        INTEGER NOT NULL,
    type       TEXT NOT NULL,
    payload    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, seq)
);

CREATE TABLE IF NOT EXISTS runtime.approvals (
    id          TEXT PRIMARY KEY,
    run_id      TEXT NOT NULL REFERENCES runtime.runs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    tool        TEXT NOT NULL,
    arguments   JSONB NOT NULL,
    risk        TEXT NOT NULL, -- low|medium|high
    status      TEXT NOT NULL, -- pending|approved|edited|rejected|expired
    decided_by  UUID,
    decided_at  TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS approvals_workspace_status_idx ON runtime.approvals (workspace_id, status);

CREATE TABLE IF NOT EXISTS runtime.usage_daily (
    workspace_id UUID NOT NULL,
    day          DATE NOT NULL,
    runs         INTEGER NOT NULL DEFAULT 0,
    tokens       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (workspace_id, day)
);

CREATE TABLE IF NOT EXISTS runtime.tool_policies (
    demo    TEXT NOT NULL,
    tool    TEXT NOT NULL,
    policy  TEXT NOT NULL, -- allow|ask|deny
    risk    TEXT NOT NULL, -- low|medium|high
    PRIMARY KEY (demo, tool)
);

CREATE TABLE IF NOT EXISTS runtime.recorded_runs (
    id       SERIAL PRIMARY KEY,
    demo     TEXT NOT NULL,
    scenario TEXT NOT NULL,
    events   JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS runtime.schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
