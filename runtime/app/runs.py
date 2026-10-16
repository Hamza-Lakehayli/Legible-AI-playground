"""Run lifecycle with SSE (M3 replaces the in-memory store with Postgres
and scripted demos with real agents; the event contract stays identical).

Event types (spec): run.started, message.delta, tool.requested,
approval.required, approval.resolved, tool.completed, run.completed,
run.failed — every event carries run id, sequence number, timestamp.
"""

import asyncio
import time
from dataclasses import dataclass, field

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from .auth import verify_token
from .config import get_settings

router = APIRouter()


@dataclass
class Run:
    id: str
    workspace_id: str
    user_id: str
    demo: str
    status: str = "queued"
    events: list[dict] = field(default_factory=list)
    approval_gate: int | None = None  # event seq that pauses the run


RUNS: dict[str, Run] = {}
_LOCK = asyncio.Lock()


def _emit(run: Run, type_: str, payload: dict) -> dict:
    event = {
        "run_id": run.id,
        "seq": len(run.events) + 1,
        "type": type_,
        "payload": payload,
        "ts": time.time(),
    }
    run.events.append(event)
    return event


def _scripted_events(run: Run) -> None:
    """A deterministic sample run: request -> tool -> policy gate -> done.

    This is the M0 skeleton; M3 swaps it for the governed-agent demo with
    real pause/resume persisted to Postgres.
    """
    run.status = "running"
    _emit(run, "run.started", {"demo": run.demo, "model": get_settings().nvidia_model})
    _emit(run, "message.delta", {"text": "Checking the order before acting."})
    _emit(
        run,
        "tool.requested",
        {"tool": "orders.lookup", "arguments": {"order_id": "4821"}, "risk": "low"},
    )
    _emit(run, "tool.completed", {"tool": "orders.lookup", "summary": "order found"})
    _emit(
        run,
        "tool.requested",
        {"tool": "orders.refund", "arguments": {"order_id": "4821", "amount": "49.90"}, "risk": "high"},
    )
    gate = _emit(run, "approval.required", {"approval_id": "ap_001", "expires_in": 600})
    run.approval_gate = gate["seq"]
    run.status = "waiting"


def _resume_events(run: Run) -> None:
    _emit(run, "approval.resolved", {"approval_id": "ap_001", "decision": "approved"})
    _emit(run, "tool.completed", {"tool": "orders.refund", "summary": "refund_id: rf_2211"})
    _emit(run, "run.completed", {"tokens_in": 1204, "tokens_out": 486})
    run.status = "completed"


@router.post("/runs", status_code=status.HTTP_201_CREATED)
async def start_run(request: Request) -> dict:
    claims = _claims_from_request(request)
    run_id = f"run_{len(RUNS) + 1:06d}"
    run = Run(
        id=run_id,
        workspace_id=claims["ws"],
        user_id=claims["sub"],
        demo=claims.get("demo", "governed-agent"),
    )
    async with _LOCK:
        RUNS[run_id] = run
    _scripted_events(run)
    return {"run_id": run_id, "status": run.status}


@router.get("/runs/{run_id}/events")
async def run_events(run_id: str, request: Request) -> StreamingResponse:
    claims = _claims_from_request(request)
    run = RUNS.get(run_id)
    if not run or run.workspace_id != claims["ws"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")

    last_event_id = request.headers.get("last-event-id")

    async def stream():
        start_seq = int(last_event_id) + 1 if last_event_id else 1
        sent = start_seq - 1
        while True:
            while sent < len(run.events):
                event = run.events[sent]
                sent += 1
                yield f"id: {event['seq']}\nevent: {event['type']}\ndata: {event['payload']}\n\n"
            if run.status in {"completed", "failed", "expired"} and sent >= len(run.events):
                yield "event: stream.end\ndata: {}\n\n"
                return
            await asyncio.sleep(0.2)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/approvals/{approval_id}")
async def resolve_approval(approval_id: str, request: Request) -> dict:
    claims = _claims_from_request(request)
    body = await request.json()
    decision = body.get("decision")
    if decision not in {"approved", "edited", "rejected"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "invalid decision")

    for run in RUNS.values():
        if run.workspace_id == claims["ws"] and run.status == "waiting":
            if decision == "rejected":
                _emit(run, "run.failed", {"code": "rejected", "message": "action rejected"})
                run.status = "failed"
            else:
                _resume_events(run)
            return {"run_id": run.id, "status": run.status}

    raise HTTPException(status.HTTP_404_NOT_FOUND, "no waiting run for this workspace")


def _claims_from_request(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    return verify_token(auth.removeprefix("Bearer ").strip(), get_settings().runtime_token_public_key)
