import asyncio
import json

import httpx
import pytest

from app import model_requests as models
from app.config import Settings


def setup_client(monkeypatch, handler, **settings):
    monkeypatch.setattr(models, "get_settings", lambda: Settings(
        _env_file=None, nvidia_api_key="test-only", nvidia_model="primary", **settings,
    ))
    client = httpx.AsyncClient
    monkeypatch.setattr(models.httpx, "AsyncClient", lambda: client(transport=httpx.MockTransport(handler)))


def run():
    return asyncio.run(models.request_completion({"model": "primary", "messages": []}))


@pytest.mark.parametrize("status", [429, 500, 503])
def test_fallback_is_attributed(monkeypatch, status):
    calls = []

    async def handler(request):
        calls.append(json.loads(request.content)["model"])
        return httpx.Response(status if len(calls) == 1 else 200, json={"choices": [{}]})

    setup_client(monkeypatch, handler, fallback_model="secondary")
    result = run()
    assert calls == ["primary", "secondary"]
    assert result["_trace"] == {"model": "secondary", "attempts": [
        {"model": "primary", "error": f"HTTP {status}"}, {"model": "secondary"},
    ]}


@pytest.mark.parametrize("status", [400, 401, 403, 422])
def test_non_retryable_errors_are_sanitized(monkeypatch, status):
    calls = []

    async def handler(request):
        calls.append(request)
        return httpx.Response(status, text="secret-upstream-body")

    setup_client(monkeypatch, handler, fallback_model="secondary")
    with pytest.raises(models.ModelRequestError) as caught:
        run()
    assert len(calls) == 1
    assert "secret" not in str(caught.value)
    assert "test-only" not in str(caught.value)


def test_fallback_exhaustion_and_unset_default(monkeypatch):
    async def handler(request):
        return httpx.Response(503)

    setup_client(monkeypatch, handler, fallback_model="secondary")
    with pytest.raises(models.ModelRequestError) as caught:
        run()
    assert len(caught.value.attempts) == 2

    monkeypatch.setattr(models, "get_settings", lambda: Settings(_env_file=None, nvidia_api_key="test-only"))
    with pytest.raises(models.ModelRequestError) as caught:
        run()
    assert len(caught.value.attempts) == 1


def test_shared_deadline_cancels_fallback(monkeypatch):
    calls, cancelled = [], []

    async def handler(request):
        calls.append(json.loads(request.content)["model"])
        if len(calls) == 1:
            await asyncio.sleep(0.03)
            return httpx.Response(429)
        try:
            await asyncio.sleep(10)
        finally:
            cancelled.append(True)
        return httpx.Response(200, json={"choices": [{}]})

    setup_client(monkeypatch, handler, fallback_model="secondary", model_request_budget_seconds=0.06)
    with pytest.raises(models.ModelRequestError, match="0.06s budget") as caught:
        run()
    assert cancelled == [True]
    assert calls == ["primary", "secondary"]
    assert caught.value.attempts[-1]["error"] == "deadline exceeded"


def test_external_cancellation_is_not_retried(monkeypatch):
    async def handler(request):
        raise asyncio.CancelledError

    setup_client(monkeypatch, handler, fallback_model="secondary")
    with pytest.raises(asyncio.CancelledError):
        run()


def test_approval_wait_is_outside_each_model_request_budget(monkeypatch):
    from app.demos import governed_agent
    from tests.test_runs import _Pool, _async_value

    calls = []

    async def handler(request):
        calls.append(True)
        message = {"tool_calls": [{"id": "refund_1", "function": {
            "name": "orders_refund", "arguments": '{"order_id":"4821","amount":"49.90"}',
        }}]} if len(calls) == 1 else {"content": "Done after approval."}
        return httpx.Response(200, json={"choices": [{"message": message}]})

    setup_client(monkeypatch, handler, model_request_budget_seconds=0.03)
    monkeypatch.setattr(governed_agent, "get_pool", lambda: _async_value(_Pool()))

    async def completion(messages, **kwargs):
        return await models.request_completion({"model": "primary", "messages": messages})

    async def approval_and_tool(*args, **kwargs):
        await asyncio.sleep(0.06)  # Longer than the model budget; still allowed.
        return {"success": True}

    async def noop(*args, **kwargs):
        return None

    monkeypatch.setattr(governed_agent, "_request_completion", completion)
    monkeypatch.setattr(governed_agent, "_invoke_tool", approval_and_tool)
    result = asyncio.run(governed_agent._agent_loop(
        "run_test", [], workspace_id="ws", user_id="user", emit=noop,
        set_status=noop, finalize=False,
    ))
    assert result["text"] == "Done after approval."
    assert len(calls) == 2
