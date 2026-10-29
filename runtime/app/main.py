import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import close_pool
from .runs import _tasks, recover_interrupted_runs, router as runs_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await recover_interrupted_runs()
    yield
    for task in tuple(_tasks):
        task.cancel()
    if _tasks:
        await asyncio.gather(*_tasks, return_exceptions=True)
    await close_pool()


app = FastAPI(
    title="AI Showcase Runtime",
    version="0.1.0",
    description="Data plane: agent runs, policies, approvals, SSE event streams.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Last-Event-ID", "Content-Type"],
)

app.include_router(runs_router)


@app.get("/healthz")
async def healthz() -> dict:
    return {
        "ok": True,
        "service": "runtime",
        "model": settings.nvidia_model,
        "database": bool(settings.database_url),
    }
