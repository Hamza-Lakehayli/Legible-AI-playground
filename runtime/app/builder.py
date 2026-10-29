"""Builder runs: agent specs and workflow graphs.

Both are executed by the same governed loop as the demo, so approvals,
tool validation, and event attribution never diverge between surfaces.
"""

import json
import logging
import time
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .db import get_pool
from .demos.governed_agent import (
    _TOOLS,
    _agent_loop,
    _invoke_tool,
    _load_run_scope,
    _request_completion,
    _tool_id,
    TimeLimitExceeded,
    ToolRejected,
    validate_tool_arguments,
)

TOOL_IDS = {"orders.lookup", "orders.refund"}
MAX_STEPS = 24
MAX_WORKFLOW_SECONDS = 240
logger = logging.getLogger(__name__)

NodeType = Literal["start", "agent", "llm", "tool", "decision", "end"]


class AgentSpec(BaseModel):
    """An agent built in the playground card."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=240)
    model: str | None = Field(default=None, max_length=120)
    system_prompt: str = Field(min_length=1, max_length=4000)
    tools: list[Literal["orders.lookup", "orders.refund"]] = Field(default_factory=list)
    approval: dict[
        Literal["orders.lookup", "orders.refund"], Literal["ask", "auto"]
    ] = Field(default_factory=dict)


class GraphNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    type: NodeType
    label: str = Field(default="", max_length=80)
    config: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=80)
    source: str = Field(min_length=1, max_length=64)
    target: str = Field(min_length=1, max_length=64)
    label: str | None = Field(default=None, max_length=40)


class WorkflowGraph(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(default="Untitled workflow", max_length=80)
    nodes: list[GraphNode] = Field(min_length=1, max_length=40)
    edges: list[GraphEdge] = Field(default_factory=list, max_length=80)


def validate_graph(graph: WorkflowGraph, agents: dict[str, AgentSpec]) -> None:
    """Raise ValueError with every structural problem in one message."""
    errors: list[str] = []
    ids = [node.id for node in graph.nodes]
    if len(ids) != len(set(ids)):
        errors.append("Node ids must be unique.")
    known = set(ids)

    starts = [node for node in graph.nodes if node.type == "start"]
    ends = [node for node in graph.nodes if node.type == "end"]
    if len(starts) != 1:
        errors.append("The workflow needs exactly one Start node.")
    if not ends:
        errors.append("The workflow needs at least one End node.")

    for edge in graph.edges:
        if edge.source not in known:
            errors.append(f"Edge {edge.id} starts at a missing node.")
        if edge.target not in known:
            errors.append(f"Edge {edge.id} points at a missing node.")

    outgoing: dict[str, list[GraphEdge]] = {node_id: [] for node_id in known}
    for edge in graph.edges:
        if edge.source in outgoing:
            outgoing[edge.source].append(edge)

    if starts:
        seen = {starts[0].id}
        queue = [starts[0].id]
        while queue:
            current = queue.pop(0)
            for edge in outgoing.get(current, []):
                if edge.target not in seen and edge.target in known:
                    seen.add(edge.target)
                    queue.append(edge.target)
        for node in graph.nodes:
            if node.id not in seen:
                errors.append(f"Node “{node.label or node.id}” is unreachable from Start.")

    for node in graph.nodes:
        if node.type == "end" and outgoing.get(node.id):
            errors.append(f"End node “{node.label or node.id}” cannot have outgoing edges.")
        if node.type == "decision":
            branches = outgoing.get(node.id, [])
            if not branches:
                errors.append(f"Decision “{node.label or node.id}” needs at least one branch.")
            if any(not (edge.label or "").strip() for edge in branches):
                errors.append(f"Every branch out of “{node.label or node.id}” needs a label.")
        if node.type == "agent":
            agent_id = str(node.config.get("agentId") or "")
            if agent_id not in agents:
                errors.append(f"Agent node “{node.label or node.id}” has no agent selected.")
        if node.type == "tool":
            if str(node.config.get("tool") or "") not in TOOL_IDS:
                errors.append(f"Tool node “{node.label or node.id}” has no tool selected.")
        if node.type == "llm" and not str(node.config.get("prompt") or "").strip():
            errors.append(f"LLM node “{node.label or node.id}” needs a prompt.")

    if errors:
        raise ValueError(" ".join(dict.fromkeys(errors)))


def _agent_tool_schemas(spec: AgentSpec) -> list[dict]:
    selected = set(spec.tools)
    return [
        schema
        for schema in _TOOLS
        if _tool_id(schema["function"]["name"]) in selected
    ]


def _spec_policy(spec: AgentSpec):
    def policy(tool: str, risk: str) -> str:
        mode = spec.approval.get(tool)
        if mode is None:
            return "ask" if risk == "high" else "allow"
        return "ask" if mode == "ask" else "allow"

    return policy


def _node_ref(node: GraphNode) -> dict:
    return {"id": node.id, "label": node.label or node.type}


def _node_label(node: GraphNode) -> str:
    return node.label or node.type.capitalize()


async def execute_agent_spec(
    run_id: str,
    task_input: str,
    spec: AgentSpec,
    emit,
    set_status,
) -> None:
    workspace_id, user_id = await _load_run_scope(run_id)
    messages = [
        {"role": "system", "content": spec.system_prompt},
        {"role": "user", "content": task_input},
    ]
    try:
        await _agent_loop(
            run_id,
            messages,
            workspace_id=workspace_id,
            user_id=user_id,
            emit=emit,
            set_status=set_status,
            tool_schemas=_agent_tool_schemas(spec),
            model=spec.model,
            policy_for=_spec_policy(spec),
            finalize=True,
        )
    except TimeLimitExceeded:
        await emit(
            run_id,
            "run.failed",
            {
                "code": "time_limit",
                "message": "The run exceeded its execution time limit.",
            },
        )
        await set_status(run_id, "failed", finished=True)


def _render_template(template: str, state: dict[str, str]) -> str:
    return (
        template.replace("{{input}}", state.get("input", ""))
        .replace("{{last}}", state.get("last", ""))
    )


def _decision_matches(config: dict[str, Any], last: str) -> bool:
    mode = str(config.get("mode") or "always")
    value = str(config.get("value") or "")
    text = last.lower()
    if mode == "always":
        return True
    if mode == "contains":
        return value.lower() in text
    if mode == "equals":
        return text.strip() == value.lower()
    raise ValueError(f"Unknown decision mode “{mode}”.")


async def execute_workflow(
    run_id: str,
    task_input: str,
    graph: WorkflowGraph,
    agents: dict[str, AgentSpec],
    emit,
    set_status,
) -> None:
    validate_graph(graph, agents)
    workspace_id, user_id = await _load_run_scope(run_id)
    by_id = {node.id: node for node in graph.nodes}
    outgoing: dict[str, list[GraphEdge]] = {node.id: [] for node in graph.nodes}
    for edge in graph.edges:
        outgoing[edge.source].append(edge)

    start = next(node for node in graph.nodes if node.type == "start")
    state = {"input": task_input, "last": ""}
    tokens_in = 0
    tokens_out = 0
    steps = 0
    current: GraphNode | None = start
    started = time.monotonic()

    async def step_event(node: GraphNode, status: str, **extra: Any) -> None:
        await emit(
            run_id,
            "workflow.step",
            {
                "node_id": node.id,
                "node_label": _node_label(node),
                "node_type": node.type,
                "status": status,
                "step": steps,
                **extra,
            },
        )

    try:
        while current is not None:
            if steps >= MAX_STEPS:
                raise TimeLimitExceeded("The workflow reached its step limit.")
            if time.monotonic() - started > MAX_WORKFLOW_SECONDS:
                raise TimeLimitExceeded("The workflow exceeded its time limit.")
            steps += 1
            node = current
            ref = _node_ref(node)
            await step_event(node, "entered")
            output = ""

            if node.type == "start":
                output = state["input"]

            elif node.type == "agent":
                spec = agents.get(str(node.config.get("agentId") or ""))
                if spec is None:
                    raise ValueError("The agent node has no agent selected.")
                node_input = str(
                    node.config.get("input") or state["last"] or state["input"]
                )
                result = await _agent_loop(
                    run_id,
                    [
                        {"role": "system", "content": spec.system_prompt},
                        {"role": "user", "content": node_input},
                    ],
                    workspace_id=workspace_id,
                    user_id=user_id,
                    emit=emit,
                    set_status=set_status,
                    tool_schemas=_agent_tool_schemas(spec),
                    model=spec.model,
                    policy_for=_spec_policy(spec),
                    node=ref,
                    finalize=False,
                )
                tokens_in += result["tokens_in"]
                tokens_out += result["tokens_out"]
                output = result["text"]

            elif node.type == "llm":
                prompt = _render_template(str(node.config.get("prompt") or ""), state)
                result = await _request_completion(
                    [{"role": "user", "content": prompt}], tools=False
                )
                if result.get("_trace"):
                    await emit(run_id, "model.completed", {**result["_trace"], "node": ref})
                message = result["choices"][0].get("message") or {}
                content = message.get("content")
                if not isinstance(content, str) or not content.strip():
                    raise RuntimeError("The model returned an empty response.")
                usage = result.get("usage") or {}
                tokens_in += int(usage.get("prompt_tokens", 0))
                tokens_out += int(usage.get("completion_tokens", 0))
                output = content
                await emit(run_id, "message.delta", {"text": content, "node": ref})

            elif node.type == "tool":
                tool = str(node.config.get("tool") or "")
                arguments = node.config.get("arguments") or {}
                if not isinstance(arguments, dict):
                    raise ValueError("Tool arguments must be a JSON object.")
                arguments = validate_tool_arguments(tool, arguments)
                mode = str(node.config.get("approval") or "ask")
                result = await _invoke_tool_node(
                    run_id,
                    workspace_id,
                    user_id,
                    tool,
                    arguments,
                    mode=mode,
                    emit=emit,
                    set_status=set_status,
                    node=ref,
                )
                output = json.dumps(result)

            elif node.type == "decision":
                matched = _decision_matches(node.config, state["last"])
                branch = str(
                    node.config.get("trueLabel" if matched else "falseLabel")
                    or ("yes" if matched else "no")
                )
                edges = outgoing.get(node.id, [])
                chosen = next(
                    (
                        edge
                        for edge in edges
                        if (edge.label or "").strip().lower() == branch.lower()
                    ),
                    None,
                )
                if chosen is None:
                    chosen = next(
                        (
                            edge
                            for edge in edges
                            if (edge.label or "").strip().lower() == "default"
                        ),
                        None,
                    )
                if chosen is None:
                    raise ValueError(f"No branch matches “{branch}”.")
                output = branch
                await step_event(node, "completed", branch=branch, output=branch)
                current = by_id.get(chosen.target)
                continue

            elif node.type == "end":
                output = state["last"] or state["input"]

            await step_event(node, "completed", output=output[:400])
            state["last"] = output
            edges = outgoing.get(node.id, [])
            if node.type == "end":
                current = None
            elif not edges:
                raise ValueError(
                    f"Node “{_node_label(node)}” has no outgoing edge."
                )
            else:
                current = by_id.get(edges[0].target)

        pool = await get_pool()
        if pool is None:
            raise RuntimeError("Runtime database is not configured")
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE runtime.runs
                   SET status = 'completed', tokens_in = $2, tokens_out = $3,
                       ended_at = now()
                   WHERE id = $1""",
                run_id,
                tokens_in,
                tokens_out,
            )
        await emit(
            run_id,
            "run.completed",
            {
                "output": state["last"][:1000],
                "steps": steps,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
        )

    except ToolRejected as exc:
        final_status = "failed" if exc.decision == "rejected" else "expired"
        await emit(
            run_id,
            "run.failed" if exc.decision == "rejected" else "run.expired",
            {
                "code": exc.decision,
                "message": "The requested action was not executed.",
            },
        )
        await set_status(run_id, final_status, finished=True)
    except TimeLimitExceeded as exc:
        await emit(
            run_id,
            "run.failed",
            {"code": "step_limit", "message": str(exc)},
        )
        await set_status(run_id, "failed", finished=True)
    except Exception as exc:  # surfaced in the trace, never swallowed
        from .model_requests import ModelRequestError

        logger.exception("Workflow run failed: %s", run_id)
        await emit(
            run_id,
            "run.failed",
            {
                "code": "node_error",
                "message": str(exc) if isinstance(exc, ModelRequestError) else "The workflow node failed.",
                "node": _node_ref(current) if current else None,
                "attempts": exc.attempts if isinstance(exc, ModelRequestError) else [],
            },
        )
        # Persist the terminal event before exposing terminal status: otherwise
        # an SSE reader can observe 'failed' and close before this event exists.
        await set_status(run_id, "failed", finished=True)


async def _invoke_tool_node(
    run_id: str,
    workspace_id: str,
    user_id: str,
    tool: str,
    arguments: dict,
    *,
    mode: str,
    emit,
    set_status,
    node: dict,
) -> dict:
    risk = "high" if tool == "orders.refund" else "low"
    policy = "ask" if mode == "ask" else "allow"
    return await _invoke_tool(
        run_id,
        workspace_id,
        user_id,
        tool,
        arguments,
        risk=risk,
        policy=policy,
        emit=emit,
        set_status=set_status,
        node=node,
    )
