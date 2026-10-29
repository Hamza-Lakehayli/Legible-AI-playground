"""Persisted run lifecycle and resumable event streams."""

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, Literal
from uuid import uuid4

from asyncpg import Pool
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .auth import verify_token
from .builder import (
    AgentSpec,
    WorkflowGraph,
    execute_agent_spec,
    execute_workflow,
    validate_graph,
)
from .config import get_settings
from .db import get_pool
from .demos.governed_agent import execute_governed_agent

router = APIRouter()
_tasks: set[asyncio.Task[None]] = set()
_TERMINAL = {"completed", "failed", "expired", "cancelled"}
logger = logging.getLogger(__name__)


class StartRunBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input: str = Field(min_length=1, max_length=5000)
    kind: Literal["agent", "workflow"] = "agent"
    spec: AgentSpec | None = None
    graph: WorkflowGraph | None = None
    agents: dict[str, AgentSpec] = Field(default_factory=dict)


class ApprovalBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["approved", "edited", "rejected"]
    arguments: dict[str, Any] | None = None


async def _require_pool() -> Pool:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Runtime database is not configured",
        )
    return pool


def _claims_from_request(request: Request, expected_demo: str | None = None) -> dict:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    claims = verify_token(
        authorization.removeprefix("Bearer ").strip(),
        get_settings().runtime_token_public_key,
    )
    if (
        not isinstance(claims.get("sub"), str)
        or not isinstance(claims.get("ws"), str)
        or not isinstance(claims.get("demo"), str)
        or not claims.get("jti")
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token claims")
    if expected_demo and claims["demo"] != expected_demo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "token is not valid for this demo")
    if claims["demo"] != "governed-agent":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "unsupported demo")
    return claims


async def _insert_event(conn: Any, run_id: str, event_type: str, payload: dict) -> dict:
    exists = await conn.fetchval(
        "SELECT id FROM runtime.runs WHERE id = $1 FOR UPDATE",
        run_id,
    )
    if exists is None:
        raise RuntimeError(f"Cannot append an event to missing run {run_id}")
    seq = await conn.fetchval(
        "SELECT COALESCE(MAX(seq), 0) + 1 FROM runtime.run_events WHERE run_id = $1",
        run_id,
    )
    row = await conn.fetchrow(
        """INSERT INTO runtime.run_events (run_id, seq, type, payload)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING created_at""",
        run_id,
        seq,
        event_type,
        json.dumps(payload),
    )
    return {
        "run_id": run_id,
        "seq": seq,
        "type": event_type,
        "payload": payload,
        "ts": row["created_at"].timestamp(),
    }


async def _emit(run_id: str, event_type: str, payload: dict) -> dict:
    pool = await _require_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            return await _insert_event(conn, run_id, event_type, payload)


async def _set_status(run_id: str, run_status: str, *, finished: bool = False) -> None:
    pool = await _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE runtime.runs SET status = $2,
                   ended_at = CASE WHEN $3 THEN now() ELSE ended_at END
               WHERE id = $1""",
            run_id,
            run_status,
            finished,
        )


async def recover_interrupted_runs() -> None:
    """Fail persisted work that lost its in-process model context at restart."""
    pool = await get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        async with conn.transaction():
            run_ids = await conn.fetch(
                """UPDATE runtime.runs SET status = 'failed', ended_at = now()
                   WHERE status IN ('queued', 'running', 'waiting')
                   RETURNING id"""
            )
            if run_ids:
                await conn.execute(
                    """UPDATE runtime.approvals SET status = 'expired'
                       WHERE run_id = ANY($1::text[]) AND status = 'pending'""",
                    [row["id"] for row in run_ids],
                )
                for row in run_ids:
                    await _insert_event(
                        conn,
                        row["id"],
                        "run.failed",
                        {
                            "code": "runtime_restarted",
                            "message": "The runtime restarted before this run completed.",
                        },
                    )


def _failure_payload(exc: Exception) -> dict:
    from .model_requests import ModelRequestError

    if isinstance(exc, ModelRequestError):
        return {"code": "model_error", "message": str(exc), "attempts": exc.attempts}
    return {"code": "runtime_error", "message": "The run could not be completed."}


async def _run_worker(run_id: str, task_input: str) -> None:
    try:
        await _set_status(run_id, "running")
        await execute_governed_agent(run_id, task_input, _emit, _set_status)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception("Governed-agent run failed: %s", run_id)
        try:
            await _emit(
                run_id,
                "run.failed",
                _failure_payload(exc),
            )
            await _set_status(run_id, "failed", finished=True)
        except Exception:
            logger.exception("Could not persist failure for run: %s", run_id)


async def _run_builder_worker(run_id: str, body: StartRunBody) -> None:
    try:
        await _set_status(run_id, "running")
        if body.kind == "workflow":
            assert body.graph is not None
            await execute_workflow(
                run_id,
                body.input,
                body.graph,
                body.agents,
                _emit,
                _set_status,
            )
        else:
            assert body.spec is not None
            await execute_agent_spec(run_id, body.input, body.spec, _emit, _set_status)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception("Builder run failed: %s", run_id)
        try:
            await _emit(
                run_id,
                "run.failed",
                _failure_payload(exc),
            )
            await _set_status(run_id, "failed", finished=True)
        except Exception:
            logger.exception("Could not persist failure for run: %s", run_id)


@router.post("/runs", status_code=status.HTTP_201_CREATED)
async def start_run(request: Request) -> dict:
    claims = _claims_from_request(request, expected_demo="governed-agent")
    try:
        body = StartRunBody.model_validate(await request.json())
    except (ValueError, ValidationError) as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "input must be a JSON object with a non-empty input (maximum 5000 characters)",
        ) from exc

    if body.kind == "workflow":
        if body.graph is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "a workflow run needs a graph",
            )
        try:
            validate_graph(body.graph, body.agents)
        except ValueError as exc:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                str(exc),
            ) from exc

    pool = await _require_pool()
    run_id = f"run_{uuid4().hex}"
    settings = get_settings()

    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO runtime.runs
                   (id, workspace_id, user_id, demo, status, model)
               VALUES ($1, $2::uuid, $3::uuid, $4, 'queued', $5)""",
            run_id,
            claims["ws"],
            claims["sub"],
            claims["demo"],
            settings.nvidia_model,
        )
    await _emit(
        run_id,
        "run.started",
        {
            "demo": claims["demo"],
            "model": settings.nvidia_model,
            "kind": body.kind,
        },
    )

    if body.kind == "workflow" or body.spec is not None:
        task = asyncio.create_task(_run_builder_worker(run_id, body))
    else:
        task = asyncio.create_task(_run_worker(run_id, body.input))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"run_id": run_id, "status": "queued"}


@router.get("/runs/{run_id}/events")
async def run_events(run_id: str, request: Request) -> StreamingResponse:
    claims = _claims_from_request(request)
    pool = await _require_pool()
    async with pool.acquire() as conn:
        run = await conn.fetchrow(
            "SELECT status FROM runtime.runs WHERE id = $1 AND workspace_id = $2::uuid",
            run_id,
            claims["ws"],
        )
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")

    last_event_id = request.headers.get("last-event-id", "0")
    try:
        cursor = int(last_event_id)
        if cursor < 0:
            raise ValueError
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid Last-Event-ID")

    async def stream() -> AsyncIterator[str]:
        nonlocal cursor
        while True:
            if await request.is_disconnected():
                return
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT seq, type, payload, created_at
                       FROM runtime.run_events
                       WHERE run_id = $1 AND seq > $2
                       ORDER BY seq""",
                    run_id,
                    cursor,
                )
                current = await conn.fetchval(
                    "SELECT status FROM runtime.runs WHERE id = $1",
                    run_id,
                )

            for row in rows:
                payload = row["payload"]
                if isinstance(payload, str):
                    payload = json.loads(payload)
                cursor = row["seq"]
                event = {
                    "run_id": run_id,
                    "seq": row["seq"],
                    "type": row["type"],
                    "payload": payload,
                    "ts": row["created_at"].timestamp(),
                }
                yield (
                    f"id: {cursor}\nevent: {row['type']}\n"
                    f"data: {json.dumps(event, separators=(',', ':'))}\n\n"
                )
            if current in _TERMINAL and not rows:
                yield "event: stream.end\ndata: {}\n\n"
                return
            if not rows:
                yield ": keep-alive\n\n"
                await asyncio.sleep(0.5)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/approvals/{approval_id}")
async def resolve_approval(approval_id: str, request: Request, body: ApprovalBody) -> dict:
    claims = _claims_from_request(request, expected_demo="governed-agent")
    if body.decision not in {"approved", "edited", "rejected"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "invalid decision")
    if body.decision == "edited" and body.arguments is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "edited arguments are required")
    if body.decision != "edited" and body.arguments is not None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "arguments are only valid for edits")

    pool = await _require_pool()
    expired = False
    async with pool.acquire() as conn:
        async with conn.transaction():
            approval = await conn.fetchrow(
                """SELECT id, run_id, tool, arguments, status, expires_at
                   FROM runtime.approvals
                   WHERE id = $1 AND workspace_id = $2::uuid
                   FOR UPDATE""",
                approval_id,
                claims["ws"],
            )
            if approval is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "approval not found")
            if approval["status"] != "pending":
                raise HTTPException(status.HTTP_409_CONFLICT, "approval is no longer pending")
            if approval["expires_at"].timestamp() <= time.time():
                await conn.execute(
                    """UPDATE runtime.approvals SET status = 'expired'
                       WHERE id = $1 AND status = 'pending'""",
                    approval_id,
                )
                expired = True
            else:
                arguments = approval["arguments"]
                if isinstance(arguments, str):
                    arguments = json.loads(arguments)
                if body.decision == "edited":
                    try:
                        arguments = validate_tool_arguments(approval["tool"], body.arguments or {})
                    except (ValueError, ValidationError) as exc:
                        raise HTTPException(
                            status.HTTP_422_UNPROCESSABLE_CONTENT,
                            f"invalid tool arguments: {exc}",
                        ) from exc

                await conn.execute(
                    """UPDATE runtime.approvals
                       SET status = $2, arguments = $3::jsonb,
                           decided_by = $4::uuid, decided_at = now()
                       WHERE id = $1""",
                    approval_id,
                    body.decision,
                    json.dumps(arguments),
                    claims["sub"],
                )
    if expired:
        raise HTTPException(status.HTTP_410_GONE, "approval has expired")
    return {"approval_id": approval_id, "status": body.decision}


def validate_tool_arguments(tool: str, arguments: dict) -> dict:
    from .demos.governed_agent import validate_tool_arguments as validate

    return validate(tool, arguments)
