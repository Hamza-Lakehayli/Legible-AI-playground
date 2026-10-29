import asyncio
import json
import time
from types import SimpleNamespace
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from app import builder, runs
from app.demos import governed_agent
from app.main import app
from tests.test_runs import _Pool, _async_value, _auth, _b64, _no_op, _token


def _setup(monkeypatch, pool):
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    workspace_id = str(uuid4())
    token = _token(private_key, workspace_id)
    _patch_pool(monkeypatch, pool)
    monkeypatch.setattr(
        runs,
        "get_settings",
        lambda: SimpleNamespace(
            runtime_token_public_key=_b64(public_key),
            nvidia_model="test-model",
        ),
    )
    monkeypatch.setattr("app.main.close_pool", _no_op)
    monkeypatch.setattr("app.main.recover_interrupted_runs", _no_op)
    return token, workspace_id


def _patch_pool(monkeypatch, pool):
    monkeypatch.setattr(runs, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(builder, "get_pool", lambda: _async_value(pool))
    monkeypatch.setattr(governed_agent, "get_pool", lambda: _async_value(pool))


def _seed_run(pool, run_id, workspace_id):
    pool.connection.runs[run_id] = {
        "workspace_id": workspace_id,
        "user_id": str(uuid4()),
        "status": "running",
    }


def _events(pool, run_id):
    return pool.connection.events.get(run_id, [])


def _graph(nodes, edges, name="Test flow"):
    return builder.WorkflowGraph.model_validate(
        {"name": name, "nodes": nodes, "edges": edges}
    )


def _node(node_id, node_type, label=None, **config):
    return {
        "id": node_id,
        "type": node_type,
        "label": label or node_id,
        "config": config,
    }


def _edge(source, target, label=None):
    return {
        "id": f"{source}-{target}",
        "source": source,
        "target": target,
        "label": label,
    }


def test_agent_spec_run_completes_and_streams(monkeypatch) -> None:
    pool = _Pool()
    token, _ = _setup(monkeypatch, pool)

    async def fake_completion(_messages, *, tools=True, **_kwargs):
        assert tools is True
        return {
            "choices": [{"message": {"content": "Order 4821 qualifies."}}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 3},
        }

    monkeypatch.setattr(governed_agent, "_request_completion", fake_completion)

    with TestClient(app) as client:
        started = client.post(
            "/runs",
            headers=_auth(token),
            json={
                "kind": "agent",
                "input": "Check order 4821.",
                "spec": {
                    "name": "Support triage",
                    "system_prompt": "You are a support agent.",
                    "tools": ["orders.lookup"],
                    "approval": {},
                },
            },
        )
        assert started.status_code == 201
        run_id = started.json()["run_id"]
        for _ in range(100):
            if pool.connection.runs[run_id]["status"] == "completed":
                break
            time.sleep(0.01)

        assert pool.connection.runs[run_id]["status"] == "completed"
        types = [event["type"] for event in _events(pool, run_id)]
        assert "message.delta" in types
        assert types[-1] == "run.completed"


def test_workflow_linear_run_walks_each_node(monkeypatch) -> None:
    pool = _Pool()
    run_id = f"run_{uuid4().hex}"
    workspace_id = str(uuid4())
    _seed_run(pool, run_id, workspace_id)
    _patch_pool(monkeypatch, pool)

    async def fake_completion(_messages, *, tools=True, **_kwargs):
        assert tools is False
        return {
            "choices": [{"message": {"content": "Summary of the refund."}}],
            "usage": {"prompt_tokens": 2, "completion_tokens": 4},
        }

    monkeypatch.setattr(builder, "_request_completion", fake_completion)
    emitted = []

    async def emit(rid, event_type, payload):
        emitted.append((event_type, payload))
        return {}

    async def set_status(rid, status, *, finished=False):
        pool.connection.runs[rid]["status"] = status

    graph = _graph(
        [
            _node("start", "start", "Start"),
            _node("sum", "llm", "Summarize", prompt="Summarize: {{input}}"),
            _node("end", "end", "End"),
        ],
        [_edge("start", "sum"), _edge("sum", "end")],
    )

    asyncio.run(builder.execute_workflow(run_id, "Refund order 4821.", graph, {}, emit, set_status))

    steps = [
        payload
        for event_type, payload in emitted
        if event_type == "workflow.step" and payload["status"] == "entered"
    ]
    assert [step["node_id"] for step in steps] == ["start", "sum", "end"]
    summary = next(
        payload
        for event_type, payload in emitted
        if event_type == "workflow.step" and payload["node_id"] == "sum" and payload["status"] == "completed"
    )
    assert summary["output"] == "Summary of the refund."
    assert emitted[-1][0] == "run.completed"
    assert emitted[-1][1]["output"] == "Summary of the refund."
    assert pool.connection.runs[run_id]["status"] == "completed"


def test_workflow_decision_follows_matching_branch(monkeypatch) -> None:
    pool = _Pool()
    run_id = f"run_{uuid4().hex}"
    workspace_id = str(uuid4())
    _seed_run(pool, run_id, workspace_id)
    _patch_pool(monkeypatch, pool)

    async def fake_completion(_messages, *, tools=True, **_kwargs):
        return {
            "choices": [{"message": {"content": "The refund is approved."}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

    monkeypatch.setattr(builder, "_request_completion", fake_completion)
    emitted = []

    async def emit(rid, event_type, payload):
        emitted.append((event_type, payload))
        return {}

    async def set_status(rid, status, *, finished=False):
        pool.connection.runs[rid]["status"] = status

    graph = _graph(
        [
            _node("start", "start", "Start"),
            _node("ask", "llm", "Draft", prompt="{{input}}"),
            _node("check", "decision", "Approved?", mode="contains", value="approved"),
            _node("yes", "end", "Done"),
            _node("no", "end", "Rejected"),
        ],
        [
            _edge("start", "ask"),
            _edge("ask", "check"),
            _edge("check", "yes", "yes"),
            _edge("check", "no", "no"),
        ],
    )

    asyncio.run(builder.execute_workflow(run_id, "Refund 4821.", graph, {}, emit, set_status))

    entered = [
        payload["node_id"]
        for event_type, payload in emitted
        if event_type == "workflow.step" and payload["status"] == "entered"
    ]
    assert "yes" in entered
    assert "no" not in entered
    branches = [
        payload["branch"]
        for event_type, payload in emitted
        if event_type == "workflow.step" and payload.get("branch")
    ]
    assert branches == ["yes"]


def test_workflow_tool_node_pauses_for_approval(monkeypatch) -> None:
    pool = _Pool()
    run_id = f"run_{uuid4().hex}"
    workspace_id = str(uuid4())
    _seed_run(pool, run_id, workspace_id)
    _patch_pool(monkeypatch, pool)
    emitted = []

    async def emit(rid, event_type, payload):
        emitted.append((event_type, payload))
        return {}

    async def set_status(rid, status, *, finished=False):
        pool.connection.runs[rid]["status"] = status

    graph = _graph(
        [
            _node("start", "start", "Start"),
            _node(
                "refund",
                "tool",
                "Refund",
                tool="orders.refund",
                arguments={"order_id": "4821", "amount": "49.90"},
                approval="ask",
            ),
            _node("end", "end", "End"),
        ],
        [_edge("start", "refund"), _edge("refund", "end")],
    )

    async def scenario():
        task = asyncio.create_task(
            builder.execute_workflow(run_id, "Refund 4821.", graph, {}, emit, set_status)
        )
        for _ in range(200):
            pending = [
                approval
                for approval in pool.connection.approvals.values()
                if approval["run_id"] == run_id
            ]
            if pending:
                break
            await asyncio.sleep(0.01)
        assert pending, "the tool node never requested approval"
        pending[0]["status"] = "approved"
        await task

    asyncio.run(scenario())

    types = [event_type for event_type, _ in emitted]
    assert "approval.required" in types
    assert "tool.completed" in types
    assert emitted[-1][0] == "run.completed", emitted[-1][1]
    assert emitted[-1][1]["steps"] == 3


def test_workflow_step_budget_fails_cleanly(monkeypatch) -> None:
    pool = _Pool()
    run_id = f"run_{uuid4().hex}"
    workspace_id = str(uuid4())
    _seed_run(pool, run_id, workspace_id)
    _patch_pool(monkeypatch, pool)

    async def fake_completion(_messages, *, tools=True, **_kwargs):
        return {
            "choices": [{"message": {"content": "again"}}],
            "usage": {},
        }

    monkeypatch.setattr(builder, "_request_completion", fake_completion)
    emitted = []

    async def emit(rid, event_type, payload):
        emitted.append((event_type, payload))
        return {}

    async def set_status(rid, status, *, finished=False):
        pool.connection.runs[rid]["status"] = status

    graph = _graph(
        [
            _node("start", "start", "Start"),
            _node("loop", "llm", "Loop", prompt="{{input}}"),
            _node("end", "end", "End"),
        ],
        [_edge("start", "loop"), _edge("loop", "start"), _edge("start", "end")],
    )

    asyncio.run(builder.execute_workflow(run_id, "go", graph, {}, emit, set_status))

    assert emitted[-1][0] == "run.failed"
    assert emitted[-1][1]["code"] == "step_limit"
    assert pool.connection.runs[run_id]["status"] == "failed"


def test_invalid_graph_is_rejected_before_a_run_starts(monkeypatch) -> None:
    pool = _Pool()
    token, _ = _setup(monkeypatch, pool)

    with TestClient(app) as client:
        response = client.post(
            "/runs",
            headers=_auth(token),
            json={
                "kind": "workflow",
                "input": "go",
                "graph": {
                    "name": "Broken",
                    "nodes": [
                        _node("a", "start", "Start"),
                        _node("b", "start", "Start 2"),
                        _node("c", "end", "End"),
                    ],
                    "edges": [_edge("a", "c")],
                },
            },
        )
        assert response.status_code == 422
        assert "exactly one Start" in response.json()["detail"]
        assert pool.connection.runs == {}


def test_workflow_agent_node_uses_the_saved_agent(monkeypatch) -> None:
    pool = _Pool()
    run_id = f"run_{uuid4().hex}"
    workspace_id = str(uuid4())
    _seed_run(pool, run_id, workspace_id)
    _patch_pool(monkeypatch, pool)
    seen = {}

    async def fake_completion(messages, *, tools=True, **_kwargs):
        seen["system"] = messages[0]["content"]
        seen["tools"] = tools
        return {
            "choices": [{"message": {"content": "Handled."}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
        }

    monkeypatch.setattr(governed_agent, "_request_completion", fake_completion)
    emitted = []

    async def emit(rid, event_type, payload):
        emitted.append((event_type, payload))
        return {}

    async def set_status(rid, status, *, finished=False):
        pool.connection.runs[rid]["status"] = status

    spec = builder.AgentSpec.model_validate(
        {
            "name": "Support triage",
            "system_prompt": "You are the support agent.",
            "tools": ["orders.lookup"],
        }
    )
    graph = _graph(
        [
            _node("start", "start", "Start"),
            _node("agent", "agent", "Triage", agentId="agent_1"),
            _node("end", "end", "End"),
        ],
        [_edge("start", "agent"), _edge("agent", "end")],
    )

    asyncio.run(
        builder.execute_workflow(
            run_id, "Check 4821.", graph, {"agent_1": spec}, emit, set_status
        )
    )

    assert seen["system"] == "You are the support agent."
    assert seen["tools"] is True
    delta = next(payload for event_type, payload in emitted if event_type == "message.delta")
    assert delta["node"] == {"id": "agent", "label": "Triage"}
    assert emitted[-1][0] == "run.completed"


def test_graph_validation_reports_structural_problems() -> None:
    graph = _graph(
        [
            _node("start", "start", "Start"),
            _node("d", "decision", "Check"),
            _node("end", "end", "End"),
        ],
        [_edge("start", "d"), _edge("d", "end")],
    )
    with pytest.raises(ValueError) as exc:
        builder.validate_graph(graph, {})
    assert "Every branch" in str(exc.value)
