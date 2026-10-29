# Next steps plan — housekeeping, engine hardening, builder depth

Written 2026-10-29, picked tracks: **0 housekeeping → 1 engine hardening → 2 builder depth (B4)**.
Companion docs: `docs/agent-builder-plan.md` (v2 rework, applied), project spec §Playground.

## Implementation update — 2026-10-29

- Track 0 completed: `1dd24f0` (web builder), `e6d71cd` (runtime), `1dc38c4`
  (documentation), following `2aebb4b`. User assets remain untouched/untracked.
- Track 1 implemented: `model_requests.py` owns the shared async deadline and
  optional single fallback; safe failures and model-attempt attribution reach the
  trace. Connection checks use the existing `/healthz` endpoint. Tokens are cached
  in memory with expiry checks. Ambiguous creation failures block further starts
  in the current session and direct the user to Dashboard → Runs.
- Track 2 implemented: a capped spec-history mechanism with focus-session text
  grouping and native input undo; shared per-node validation reasons; keyboard-
  accessible branch labels; deep-copy duplication (ordinary nodes only); Blank
  and Refund approval loop templates with confirmation and undoable replacement.
  Import opens the first workflow after confirmation; library merges still keep
  existing IDs, and undo restores the canvas (not the additive library merge).
- Verification: production build and type-check passed; focused browser checks
  cover held-pointer drag visibility/persistence, history, validation, label edits,
  template cancellation/restoration, import restoration, and offline retries.
  A deliberately inverted duplication guard failed its regression test, then was
  restored. Final unit gates: 58 web tests and 34 runtime tests passing; TypeScript
  clean; ESLint has no errors (one pre-existing unused-import warning). Mobile
  390px/reduced-motion rendering and native input undo were checked as well.
- Live NVIDIA verification: `run_f5373053c20e40e488e02031907324d9` completed through
  lookup → human-approved mock refund → decision → summary, with 26 trace events,
  per-step serving-model attribution, and 2145 input / 555 output tokens. Fallback
  recovery, timeout cancellation, exhaustion, and no tool replay are verified with
  mocked upstream requests rather than deliberately disrupting NVIDIA.
- Local verification uses web port 3001 (another process owns 3000), and runtime
  port 8000 with a process-only CORS override for 3001. No environment-file values
  were changed or committed.

The sections below preserve the agreed scope; the snapshot describes the state
before implementation, not the current working tree.

## Snapshot (as of this writing)

- Playground v2 **applied and verified**: single full-screen builder, live NVIDIA run
  end-to-end, drag perf + drag-vanish fixes, gates green (tsc 0 / eslint 0 /
  vitest 46 / pytest 20).
- Committed so far: `2aebb4b` marketing chrome (glitch stage, scroll progress ring,
  previews). Everything else still uncommitted.
- Housekeeping done: `governed-agent-console.tsx` deleted (zero references; backup
  copy saved outside the repo at `%TEMP%\opencode\governed-agent-console.tsx.bak`).
- Secrets posture: `web/.env.local` + `runtime/.env` verified gitignored; tracked
  `.env.example` / `env.ts` diffs contain no values. Every slice gets a staged-diff
  sweep for `nvapi-`, `PRIVATE KEY`, and the test password before commit.
- Left untouched on purpose: Oct-17 PNGs in repo root and `docs/glitch ref/` (user's
  own assets) — stay untracked, never staged.
- Test account `opa.demo@legible.test` stays as the demo login for now (flag if it
  should be purged).
- Both dev servers are down (shells cancelled); restart only for live verification.

## Track 0 — commit housekeeping (code already green)

Three staged slices, in dependency-safe order:

| Slice | Contents | Commit message |
| --- | --- | --- |
| B | `web/app/(flow)/`, `web/app/api/playground/token/route.ts`, delete `(marketing)/playground`, `(marketing)/layout.tsx`, `app/layout.tsx`, `dashboard/layout.tsx`, `globals.css`, `components/builder/`, console `use-run-session.ts` / `run-trace.tsx` / `approval-card.tsx`, `lib/builder/`, `lib/env.ts`, `package.json`, `pnpm-lock.yaml`, `tests/builder.test.ts` | Playground v2: single full-screen flow builder with live runs |
| C | `runtime/app/{auth,main,runs,builder}.py`, `runtime/app/demos/governed_agent.py`, `runtime/tests/test_builder.py`, `runtime/tests/test_governed_agent.py`, `runtime/tests/test_runs.py`, `runtime/.env.example`, `runtime/README.md`, `runtime/requirements.txt` | Runtime: governed workflow runs, builder specs, Ed25519 tokens |
| D | `README.md`, `web/README.md`, spec, design brief, `docs/agent-builder-plan.md`, `docs/hero-glitch-plan.md`, `docs/next-steps-plan.md` | Docs: plans, READMEs, spec/brief updates |

**Done when**: `git status --short` shows only the user assets (PNGs, `glitch ref/`)
untracked; four slice commits in the log.

## Track 1 — engine hardening

### 1.1 Fallback model wiring (opt-in)
- Reuse the existing `fallback_model` setting in `runtime/app/config.py`; keep its
  default unset. An explicitly configured fallback must support the request's
  tool-calling requirements. Document that a smaller model can change behavior.
- `runtime/app/demos/governed_agent.py`: on 429/5xx/connection error or a request
  timeout, attempt the configured fallback **once**, only while the shared deadline
  has time remaining. Do not retry authentication, validation, or policy failures.
- Retry only model requests: never replay a tool call or write side effect. A
  failed/expired model request must not continue executing tools after cancellation.
- Record attempted models, fallback reason, and the model that answered in trace
  events; expose the serving model in the web trace. If fallback is unset, the
  deadline is exhausted, or fallback fails, report the attributed failure.

### 1.2 Bounded model requests
- The engine already uses async `httpx` with a 60-second request timeout. Keep
  async I/O; do not introduce a thread executor.
- Add a configurable total model-request budget (proposed default: 60 seconds)
  shared by primary and fallback attempts. Each attempt receives only the time
  remaining; a per-attempt timeout cannot extend the total deadline.
- This is a model-request bound, not a blanket node timeout: human approval waits
  are explicitly outside it. Whole-node/tool execution limits are deferred.
- On expiry, cancel the request, attribute the error to the current node, and
  terminate the run as FAILED with the configured budget in the reason. Preserve
  SSE terminal-event delivery; do not route failures as successful decisions.

### 1.3 Failure attribution
- `runs.py`: on node exception, persist `nodeId` + sanitized error text in the run
  event detail (verify current payloads; add detail keys where missing). Never
  expose credentials or raw upstream request headers in traces.

### 1.4 Web cold-start state
- `use-run-session.ts`: add a bounded connection check (proposed 3-second budget;
  verify the existing health endpoint) and a distinct client connection state,
  without adding it to persisted run statuses. A health check cannot guarantee a
  subsequent run request succeeds; handle that request's failures too.
- `run-dock.tsx`: say "Cannot reach runtime" with a manual Retry action. Show
  "Checking connection…" only during an actual request; do not claim the service
  is starting or automatically retrying without evidence.
- Obtain the run token after connectivity is checked, reuse it only while valid,
  and refresh it when expired. Retrying connectivity must never duplicate a run;
  do not blindly repeat an ambiguous run-creation request.
- `runtime/README.md`: explain offline/cold-host possibilities and manual recovery.

### 1.5 Tests
- pytest: mocked HTTP responses for fallback success/exhaustion, no fallback on
  non-retryable errors, serving-model attribution, shared deadline/cancellation,
  no tool replay, approval waits excluded, and terminal failure events.
- vitest: connection-state transitions, manual retry, token expiry handling, and
  no duplicate run creation on connection retries.

**Done when**: an induced retryable NIM failure recovers via an explicitly
configured fallback with correct attribution; exhausted attempts fail inside the
shared budget; stopping uvicorn shows an honest connection error and manual retry.

## Track 2 — builder depth (B4 subset)

### 2.1 Undo / redo foundation
- First centralize committed graph mutations behind one history mechanism, then
  build the remaining editing features on it. In-memory snapshot history capped
  at 50 entries; never record transient drag positions or measured dimensions.
- One drag gesture is one transaction. Group text edits by editing session
  (commit on blur/Enter where appropriate), not one history entry per keystroke.
- Cover graph name, inspector edits, structure/edges, label edits, import, and
  template replacement. New edits after undo clear redo. Autosave follows the
  restored graph; selection/inspector state must remain valid after restoration.
- Header controls + `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`, disabled at history ends.
  Do not intercept native undo in inputs, textareas, or editable content.

### 2.2 Validation reasons in the inspector
- Inspect the existing `validateWorkflow` return shape; extend it additively with
  per-node reasons while preserving existing callers and aggregate messages.
- Derive reasons from actual validation rules, shared by canvas invalid marks and
  inspector bullets. No tools is not automatically invalid. Graph-wide issues
  remain visible even when they cannot be assigned to one node.

### 2.3 Decision branch labels editable on canvas
- Double-click a branch label chip on a decision edge → inline input; commits to
  `edge.label` with draft autosave. List view keeps parity (single source of truth
  is the graph, not the view). Provide a keyboard-accessible edit action as well;
  Enter/blur commits, Escape cancels. Label changes use the shared undo mechanism
  and immediately revalidate branch-routing labels.

### 2.4 Duplicate node
- Inspector footer action "Duplicate": new id, position +24/+28 offset, deep-copy
  config, no edges auto-wired; one undo transaction. Restrict Start/End duplication
  according to existing graph constraints. Disconnected duplicates may legitimately
  make a draft invalid: explain the issue rather than promising a valid graph.

### 2.5 Template gallery
- A "+ New" menu beside import/export offering seeded templates from
  `lib/builder/templates.ts`: Blank, Support triage (current default), Approval
  loop. Check existing template exports first; the current support agent and
  approval loop belong to the same seeded workflow, so do not present two names
  for identical templates. Create a distinct example only if it adds useful scope.
- Confirm before replacing meaningful work, even when local autosave says saved.
  Replacement/import is undoable; cancel leaves the graph unchanged.

**Out of scope (kept for a later pass)**: sub-workflow nodes, Wait v2, agent peek/
expand, canvas edges auto-routing on duplicate — documented, not built here.

**Done when**: an invalid flow explains itself in the inspector; branch labels edit
inline and survive reload; undo/redo round-trips committed mutation types with
sensible text grouping and native input undo preserved; duplicates have independent
configs and visible validation feedback; templates replace only with confirmation
and remain undoable; the live run path still passes browser verification.

## Verification plan

- Gates after each slice: `tsc --noEmit`, `eslint`, full vitest; full pytest for
  runtime slices. Add production build verification before final sign-off.
- Add focused regression coverage alongside each feature, not just at the end:
  timeout cancellation/fallback exhaustion; history grouping/redo invalidation;
  import/template restoration; validation parity; independent duplicated configs.
- Include a focused browser drag regression early: hold a drag across multiple
  frames, verify movement and continuous visibility, then persistence on release.
  Static frames or before/after transforms alone do not prove the mid-drag fix.
- Live passes after relevant features (servers restarted): induced fallback
  recovery, offline/manual reconnection, branch-label keyboard edit, undo/redo,
  template confirmation/restoration, reduced-motion and Escape-key checks. Finish
  with author → run → approval → complete. A full e2e suite remains later scope;
  these focused regression checks do not wait for that suite.
- Secret sweep command on every staged slice before commit.

## Risks / footguns

- `validateWorkflow` signature change ripples to callers outside the builder —
  grep for call sites before editing; keep the return shape additive.
- Undo stack memory: hard cap 50, snapshots are spec-shaped (small), never DOM.
- Canvas label editing must not fight the edge `+` insert affordance (click zone
  separation; Escape commits nothing).
- Timeout cancellation must not strand SSE writes or execute tools after expiry:
  bound async model requests only, keep the walker loop ownership in one place.
- localStorage store version: undo snapshots are in-memory only — no store bump
  needed; draft persistence untouched.
- The dock run token TTL is 5 minutes: check expiry before reuse, refresh when
  needed, and separate connectivity retries from run creation.

## Later (not started here)

- Playwright e2e charter (author → run → approval → complete) — protects the drag
  and vanish fixes from regressions.
- Dashboard run-detail replay + pending-approvals inbox.
- Marketing/dashboard polish, billing flow.
