import asyncio
import base64
import json
import time
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
import pytest

from app import runs
from app.main import app


class _Acquire:
    def __init__(self, pool):
        self.pool = pool

    async def __aenter__(self):
        return self.pool.connection

    async def __aexit__(self, *_):
        return False


class _Transaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False


class _Connection:
    def __init__(self):
        self.runs = {}
        self.events = {}
        self.approvals = {}

    def transaction(self):
        return _Transaction()

    async def execute(self, query, *args):
        sql = " ".join(query.split())
        if sql.startswith("INSERT INTO runtime.runs"):
            run_id, workspace_id, user_id, demo, model = args
            self.runs[run_id] = {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "demo": demo,
                "status": "queued",
                "model": model,
            }
        elif sql.startswith("INSERT INTO runtime.approvals"):
            approval_id, run_id, workspace_id, tool, arguments, expires_in = args
            self.approvals[approval_id] = {
                "id": approval_id,
                "run_id": run_id,
                "workspace_id": workspace_id,
                "tool": tool,
                "arguments": json.loads(arguments),
                "status": "pending",
                "expires_at": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            }
        elif sql.startswith("INSERT INTO runtime.run_events"):
            run_id, seq, event_type, payload = args
            self.events.setdefault(run_id, []).append(
                {
                    "run_id": run_id,
                    "seq": seq,
                    "type": event_type,
                    "payload": json.loads(payload),
                    "created_at": datetime.now(timezone.utc),
                }
            )
        elif sql.startswith("UPDATE runtime.runs SET status = $2"):
            run_id, run_status, _finished = args
            self.runs[run_id]["status"] = run_status
        elif sql.startswith("UPDATE runtime.runs SET status = 'completed'"):
            run_id, tokens_in, tokens_out = args
            self.runs[run_id].update(
                status="completed",
                tokens_in=tokens_in,
                tokens_out=tokens_out,
            )
        elif sql.startswith("UPDATE runtime.approvals SET status = $2"):
            approval_id, decision, arguments, decided_by = args
            approval = self.approvals[approval_id]
            approval.update(
                status=decision,
                arguments=json.loads(arguments),
                decided_by=decided_by,
            )
        elif "UPDATE runtime.approvals SET status = 'expired'" in sql:
            if "run_id = ANY" in sql:
                run_ids = args[0]
                for approval in self.approvals.values():
                    if approval["run_id"] in run_ids and approval["status"] == "pending":
                        approval["status"] = "expired"
            else:
                self.approvals[args[0]]["status"] = "expired"
        else:
            raise AssertionError(f"Unexpected execute: {sql}")

    async def fetchval(self, query, *args):
        sql = " ".join(query.split())
        if "SELECT id FROM runtime.runs" in sql:
            run = self.runs.get(args[0])
            return args[0] if run else None
        if "COALESCE(MAX(seq)" in sql:
            return len(self.events.get(args[0], [])) + 1
        if "SELECT status FROM runtime.runs" in sql:
            return self.runs[args[0]]["status"]
        if "UPDATE runtime.approvals SET status = 'expired'" in sql:
            approval = self.approvals.get(args[0])
            if approval and approval["status"] == "pending":
                approval["status"] = "expired"
                return args[0]
            return None
        raise AssertionError(f"Unexpected fetchval: {sql}")

    async def fetchrow(self, query, *args):
        sql = " ".join(query.split())
        if sql.startswith("INSERT INTO runtime.run_events"):
            run_id, seq, event_type, payload = args
            event = {
                "run_id": run_id,
                "seq": seq,
                "type": event_type,
                "payload": json.loads(payload),
                "created_at": datetime.now(timezone.utc),
            }
            self.events.setdefault(run_id, []).append(event)
            return {"created_at": event["created_at"]}
        if "FROM runtime.runs WHERE id = $1 AND workspace_id" in sql:
            run = self.runs.get(args[0])
            if run and run["workspace_id"] == args[1]:
                return {"status": run["status"]}
            return None
        if "FROM runtime.runs WHERE id = $1" in sql:
            run = self.runs.get(args[0])
            if run:
                return {
                    "workspace_id": run["workspace_id"],
                    "user_id": run["user_id"],
                    "status": run["status"],
                }
            return None
        if "FROM runtime.approvals" in sql:
            approval = self.approvals.get(args[0])
            if not approval or approval["workspace_id"] != args[1]:
                return None
            return approval.copy()
        raise AssertionError(f"Unexpected fetchrow: {sql}")

    async def fetch(self, query, *args):
        sql = " ".join(query.split())
        if sql.startswith("UPDATE runtime.runs SET status = 'failed'"):
            active = []
            for run_id, run in self.runs.items():
                if run["status"] in {"queued", "running", "waiting"}:
                    run["status"] = "failed"
                    active.append({"id": run_id})
            return active
        if "FROM runtime.run_events" in sql:
            run_id, after_seq = args
            return [
                event
                for event in self.events.get(run_id, [])
                if event["seq"] > after_seq
            ]
        raise AssertionError(f"Unexpected fetch: {sql}")


class _Pool:
    def __init__(self):
        self.connection = _Connection()

    def acquire(self):
        return _Acquire(self)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _token(private_key, workspace_id: str, *, demo="governed-agent") -> str:
    payload_data = json.dumps(
        {
            "sub": str(uuid4()),
            "ws": workspace_id,
            "demo": demo,
            "plan": "free",
            "exp": time.time() + 300,
            "jti": str(uuid4()),
        }
    ).encode()
    payload = _b64(payload_data)
    signature = private_key.sign(payload_data)
    return f"{payload}.{_b64(signature)}"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_persisted_run_stream_and_resume(monkeypatch) -> None:
    pool = _Pool()
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    workspace_id = str(uuid4())
    token = _token(private_key, workspace_id)

    monkeypatch.setattr(runs, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(
        runs,
        "get_settings",
        lambda: SimpleNamespace(
            runtime_token_public_key=_b64(public_key),
            nvidia_model="test-model",
        ),
    )

    async def fake_agent(run_id, _task_input, emit, set_status):
        await emit(run_id, "message.delta", {"text": "Order checked."})
        await set_status(run_id, "completed", finished=True)
        await emit(run_id, "run.completed", {"tokens_in": 3, "tokens_out": 4})

    monkeypatch.setattr(runs, "execute_governed_agent", fake_agent)
    monkeypatch.setattr("app.main.close_pool", _no_op)
    monkeypatch.setattr("app.main.recover_interrupted_runs", _no_op)

    with TestClient(app) as client:
        response = client.post(
            "/runs",
            headers=_auth(token),
            json={"input": "Check order 4821."},
        )
        assert response.status_code == 201
        run_id = response.json()["run_id"]
        for _ in range(50):
            if pool.connection.runs[run_id]["status"] == "completed":
                break
            time.sleep(0.01)

        stream = client.get(f"/runs/{run_id}/events", headers=_auth(token))
        assert stream.status_code == 200
        assert "event: run.started" in stream.text
        assert "event: message.delta" in stream.text
        assert "event: run.completed" in stream.text
        assert "event: stream.end" in stream.text

        resumed = client.get(
            f"/runs/{run_id}/events",
            headers={**_auth(token), "Last-Event-ID": "1"},
        )
        assert "event: run.started" not in resumed.text
        assert "event: message.delta" in resumed.text

        wrong_workspace = _token(private_key, str(uuid4()))
        hidden = client.get(
            f"/runs/{run_id}/events",
            headers=_auth(wrong_workspace),
        )
        assert hidden.status_code == 404


def test_approval_is_workspace_scoped_and_validates_edits(monkeypatch) -> None:
    pool = _Pool()
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    workspace_id = str(uuid4())
    approval_id = "approval_test"
    pool.connection.approvals[approval_id] = {
        "id": approval_id,
        "run_id": "run_test",
        "tool": "orders.refund",
        "arguments": {"order_id": "4821", "amount": "49.90"},
        "status": "pending",
        "workspace_id": workspace_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    token = _token(private_key, workspace_id)
    monkeypatch.setattr(runs, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(
        runs,
        "get_settings",
        lambda: SimpleNamespace(runtime_token_public_key=_b64(public_key)),
    )
    monkeypatch.setattr("app.main.close_pool", _no_op)
    monkeypatch.setattr("app.main.recover_interrupted_runs", _no_op)

    with TestClient(app) as client:
        invalid = client.post(
            f"/approvals/{approval_id}",
            headers=_auth(token),
            json={
                "decision": "edited",
                "arguments": {"order_id": "4821", "amount": "49.9"},
            },
        )
        assert invalid.status_code == 422
        assert pool.connection.approvals[approval_id]["status"] == "pending"

        approved = client.post(
            f"/approvals/{approval_id}",
            headers=_auth(token),
            json={"decision": "approved"},
        )
        assert approved.status_code == 200
        assert pool.connection.approvals[approval_id]["status"] == "approved"

        duplicate = client.post(
            f"/approvals/{approval_id}",
            headers=_auth(token),
            json={"decision": "rejected"},
        )
        assert duplicate.status_code == 409

        wrong_workspace = _token(private_key, str(uuid4()))
        hidden = client.post(
            f"/approvals/{approval_id}",
            headers=_auth(wrong_workspace),
            json={"decision": "approved"},
        )
        assert hidden.status_code == 404


def test_restart_marks_active_runs_failed_and_expires_approvals(monkeypatch) -> None:
    pool = _Pool()
    pool.connection.runs["run_interrupted"] = {
        "workspace_id": str(uuid4()),
        "user_id": str(uuid4()),
        "status": "waiting",
    }
    pool.connection.approvals["approval_interrupted"] = {
        "id": "approval_interrupted",
        "run_id": "run_interrupted",
        "workspace_id": pool.connection.runs["run_interrupted"]["workspace_id"],
        "tool": "orders.refund",
        "arguments": {"order_id": "4821", "amount": "49.90"},
        "status": "pending",
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    monkeypatch.setattr(runs, "get_pool", lambda: _async_value(pool))

    asyncio.run(runs.recover_interrupted_runs())

    assert pool.connection.runs["run_interrupted"]["status"] == "failed"
    assert pool.connection.approvals["approval_interrupted"]["status"] == "expired"
    assert pool.connection.events["run_interrupted"][0]["payload"]["code"] == "runtime_restarted"


def test_agent_time_limit_persists_a_terminal_failure(monkeypatch) -> None:
    from app.demos import governed_agent

    pool = _Pool()
    run_id = "run_timeout"
    pool.connection.runs[run_id] = {
        "workspace_id": str(uuid4()),
        "user_id": str(uuid4()),
        "status": "running",
    }
    statuses = []
    events = []

    async def emit(_run_id, event_type, payload):
        events.append((event_type, payload))
        return {}

    async def set_status(_run_id, run_status, *, finished=False):
        statuses.append((run_status, finished))

    monkeypatch.setattr(governed_agent, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(governed_agent, "_MAX_DURATION_SECONDS", 0)

    asyncio.run(
        governed_agent.execute_governed_agent(
            run_id,
            "Check the order.",
            emit,
            set_status,
        )
    )

    assert statuses == [("failed", True)]
    assert events == [
        (
            "run.failed",
            {
                "code": "time_limit",
                "message": "The run exceeded its execution time limit.",
            },
        )
    ]


@pytest.mark.parametrize(
    ("decision", "expected_status", "expected_tools"),
    [
        ("approved", "completed", ["orders.lookup", "orders.refund"]),
        ("rejected", "failed", ["orders.lookup"]),
    ],
)
def test_governed_agent_pauses_before_refund_and_resumes_after_decision(
    monkeypatch,
    decision,
    expected_status,
    expected_tools,
) -> None:
    from app.demos import governed_agent

    pool = _Pool()
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    workspace_id = str(uuid4())
    token = _token(private_key, workspace_id)
    monkeypatch.setattr(runs, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(governed_agent, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(
        runs,
        "get_settings",
        lambda: SimpleNamespace(
            runtime_token_public_key=_b64(public_key),
            nvidia_model="test-model",
        ),
    )
    calls = iter(
        [
            {
                "choices": [
                    {
                        "message": {
                            "tool_calls": [
                                {
                                    "id": "lookup_call",
                                    "function": {
                                        "name": "orders_lookup",
                                        "arguments": '{"order_id":"4821"}',
                                    },
                                }
                            ]
                        }
                    }
                ],
                "usage": {"prompt_tokens": 4, "completion_tokens": 2},
            },
            {
                "choices": [
                    {
                        "message": {
                            "tool_calls": [
                                {
                                    "id": "refund_call",
                                    "function": {
                                        "name": "orders_refund",
                                        "arguments": '{"order_id":"4821","amount":"49.90"}',
                                    },
                                }
                            ]
                        }
                    }
                ],
                "usage": {"prompt_tokens": 6, "completion_tokens": 2},
            },
            {
                "choices": [
                    {"message": {"content": "The mock refund was completed."}}
                ],
                "usage": {"prompt_tokens": 5, "completion_tokens": 7},
            },
        ]
    )

    async def fake_completion(_messages, *, tools=True):
        assert tools is True
        return next(calls)

    monkeypatch.setattr(governed_agent, "_request_completion", fake_completion)
    executed_tools = []
    execute_tool = governed_agent._execute_mock_tool

    def track_tool(tool, arguments):
        executed_tools.append(tool)
        return execute_tool(tool, arguments)

    monkeypatch.setattr(governed_agent, "_execute_mock_tool", track_tool)
    monkeypatch.setattr("app.main.close_pool", _no_op)
    monkeypatch.setattr("app.main.recover_interrupted_runs", _no_op)

    with TestClient(app) as client:
        started = client.post(
            "/runs",
            headers=_auth(token),
            json={"input": "Check order 4821 and request its full refund."},
        )
        assert started.status_code == 201
        run_id = started.json()["run_id"]

        approval_id = None
        for _ in range(100):
            pending = [
                approval
                for approval in pool.connection.approvals.values()
                if approval["run_id"] == run_id and approval["status"] == "pending"
            ]
            if pending:
                approval_id = pending[0]["id"]
                break
            time.sleep(0.01)

        assert approval_id is not None
        assert executed_tools == ["orders.lookup"]
        assert pool.connection.runs[run_id]["status"] == "waiting"
        approved = client.post(
            f"/approvals/{approval_id}",
            headers=_auth(token),
            json={"decision": decision},
        )
        assert approved.status_code == 200

        for _ in range(100):
            if pool.connection.runs[run_id]["status"] == expected_status:
                break
            time.sleep(0.01)
        assert pool.connection.runs[run_id]["status"] == expected_status
        assert executed_tools == expected_tools

        stream = client.get(f"/runs/{run_id}/events", headers=_auth(token))
        events = stream.text
        assert events.index("event: approval.required") < events.index("event: approval.resolved")
        if decision == "approved":
            assert events.index("event: approval.resolved") < events.index(
                "event: tool.completed", events.index("event: approval.resolved")
            )
            assert "The mock refund was completed." in events
        else:
            assert "event: run.failed" in events


async def _async_value(value):
    return value


async def _no_op():
    return None
