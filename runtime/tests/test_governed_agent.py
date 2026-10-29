from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.demos.governed_agent import (
    _execute_mock_tool,
    validate_tool_arguments,
)


def test_lookup_requires_a_valid_order_id() -> None:
    arguments = validate_tool_arguments("orders.lookup", {"order_id": "4821"})

    lookup = _execute_mock_tool("orders.lookup", arguments)
    assert lookup["found"] is True
    assert "already approved" in lookup["note"]
    assert _execute_mock_tool(
        "orders.lookup",
        {"order_id": "unknown"},
    )["found"] is False

    with pytest.raises(ValidationError):
        validate_tool_arguments("orders.lookup", {"order_id": "4821", "url": "https://example.test"})


def test_refund_tool_only_changes_the_seeded_demo_record() -> None:
    args = validate_tool_arguments(
        "orders.refund",
        {"order_id": "4821", "amount": "49.90"},
    )
    result = _execute_mock_tool("orders.refund", args)

    assert result["success"] is True
    assert result["amount"] == str(Decimal("49.90"))
    assert result["order_id"] == "4821"
    assert _execute_mock_tool(
        "orders.refund",
        {"order_id": "4821", "amount": "1.00"},
    )["success"] is False


def test_model_tool_names_are_mapped_to_curated_tools() -> None:
    from app.demos.governed_agent import _tool_id

    assert _tool_id("orders_lookup") == "orders.lookup"
    assert _tool_id("orders_refund") == "orders.refund"
    assert _tool_id("unknown") is None
