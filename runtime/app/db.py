"""Async Postgres access for the runtime schema.

M0: optional — the in-memory run store works without a database.
M3: the run lifecycle persists to `runtime.runs` / `runtime.run_events`
so runs are resumable across restarts and visible in the dashboard via
the web app's read-only role.
"""

import asyncpg

from .config import get_settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool | None:
    global _pool
    settings = get_settings()
    if not settings.database_url:
        return None
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
