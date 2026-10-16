"""Mock tool registry (M3+): read-only over seeded data, no outbound
network access, visitor-supplied URLs are never fetched (spec: sandbox).
Each tool carries a JSON Schema and a policy: allow / ask / deny + risk.
"""
