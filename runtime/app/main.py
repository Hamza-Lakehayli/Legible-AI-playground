from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .runs import router as runs_router

settings = get_settings()

app = FastAPI(
    title="AI Showcase Runtime",
    version="0.1.0",
    description="Data plane: agent runs, policies, approvals, SSE event streams.",
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
