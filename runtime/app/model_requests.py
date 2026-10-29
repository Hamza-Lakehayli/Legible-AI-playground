"""Bounded model I/O only. Tool execution and approval waits never retry here."""

import asyncio
from typing import Any

import httpx

from .config import get_settings


class ModelRequestError(RuntimeError):
    """Safe to persist: contains no upstream body, URL, or credentials."""

    def __init__(self, message: str, attempts: list[dict]):
        super().__init__(message)
        self.attempts = attempts


async def request_completion(body: dict[str, Any]) -> dict:
    settings = get_settings()
    if not settings.nvidia_api_key:
        raise ModelRequestError("NVIDIA_API_KEY is not configured", [])

    primary = body["model"]
    models = [primary]
    if settings.fallback_model and settings.fallback_model != primary:
        models.append(settings.fallback_model)
    attempts: list[dict] = []
    budget = settings.model_request_budget_seconds
    deadline = asyncio.get_running_loop().time() + budget
    try:
        # HTTPX timeouts bound individual I/O operations. asyncio.timeout also
        # bounds their combined wall time, including both model attempts.
        async with asyncio.timeout(budget):
            async with httpx.AsyncClient() as client:
                for index, model in enumerate(models):
                    remaining = deadline - asyncio.get_running_loop().time()
                    if remaining <= 0:
                        raise TimeoutError
                    attempt: dict = {"model": model}
                    attempts.append(attempt)
                    try:
                        response = await client.post(
                            f"{settings.nvidia_base_url.rstrip('/')}/chat/completions",
                            headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
                            json={**body, "model": model},
                            timeout=remaining,
                        )
                        response.raise_for_status()
                    except httpx.HTTPStatusError as exc:
                        status = exc.response.status_code
                        reason = f"HTTP {status}"
                        retryable = status == 429 or 500 <= status < 600
                    except (httpx.TimeoutException, httpx.NetworkError) as exc:
                        reason = "request timeout" if isinstance(exc, httpx.TimeoutException) else "connection error"
                        retryable = True
                    else:
                        try:
                            result = response.json()
                            if not isinstance(result, dict) or not isinstance(result.get("choices"), list) or not result["choices"]:
                                raise ValueError
                        except (ValueError, TypeError):
                            attempt["error"] = "invalid model response"
                            raise ModelRequestError("The model returned an invalid response.", attempts) from None
                        served = result.get("model")
                        return {**result, "_trace": {
                            "model": served if isinstance(served, str) and served else model,
                            "attempts": attempts,
                        }}

                    attempt["error"] = reason
                    if not retryable or index == len(models) - 1:
                        raise ModelRequestError(f"Model request failed ({reason}).", attempts) from None
    except TimeoutError:
        if attempts:
            attempts[-1]["error"] = "deadline exceeded"
        raise ModelRequestError(f"Model request exceeded its {budget:g}s budget.", attempts) from None
    except httpx.RequestError:
        raise ModelRequestError("Model transport failed.", attempts) from None
    raise ModelRequestError("Model request could not be completed.", attempts)
