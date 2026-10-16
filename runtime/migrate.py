"""Minimal SQL migration runner for the runtime schema.

Usage:  python migrate.py   (reads .env / environment for DATABASE_URL)
Applies migrations/*.sql in filename order, tracked in
runtime.schema_migrations. The web schema's migrations are managed by
drizzle-kit in ../web.
"""

import asyncio
import importlib.util
import sys
from pathlib import Path

import asyncpg

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def load_settings():
    spec = importlib.util.spec_from_file_location(
        "rt_config", Path(__file__).parent / "app" / "config.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.get_settings()


async def main() -> None:
    settings = load_settings()
    if not settings.database_url:
        print("DATABASE_URL is not set — nothing to migrate.")
        sys.exit(1)

    conn = await asyncpg.connect(settings.database_url)
    try:
        await conn.execute('CREATE SCHEMA IF NOT EXISTS "runtime"')
        await conn.execute(
            """CREATE TABLE IF NOT EXISTS runtime.schema_migrations (
                   filename TEXT PRIMARY KEY,
                   applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"""
        )
        rows = await conn.fetch("SELECT filename FROM runtime.schema_migrations")
        applied = {row["filename"] for row in rows}

        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in applied:
                print(f"skip  {path.name}")
                continue
            print(f"apply {path.name}")
            await conn.execute(path.read_text(encoding="utf-8"))
            await conn.execute(
                "INSERT INTO runtime.schema_migrations (filename) VALUES ($1)",
                path.name,
            )
    finally:
        await conn.close()

    print("migrations up to date.")


if __name__ == "__main__":
    asyncio.run(main())
