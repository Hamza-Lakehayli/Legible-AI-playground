from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz() -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "runtime"


def test_runs_require_auth() -> None:
    response = client.post("/runs")
    assert response.status_code == 401


def test_events_require_auth() -> None:
    response = client.get("/runs/run_000001/events")
    assert response.status_code == 401
