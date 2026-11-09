from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Runtime configuration. Secrets live only here — never in the web app
    and never in the browser (spec: security boundaries)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    runtime_token_public_key: str | None = None

    nvidia_api_key: str | None = None
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3-ultra-550b-a55b"
    fallback_model: str | None = None
    model_request_budget_seconds: float = Field(default=60, gt=0, le=600)

    redis_url: str | None = None
    allowed_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
