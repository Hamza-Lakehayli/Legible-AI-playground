"""Token verification (spec: the runtime can verify but never mint).

The web app signs run tokens with an Ed25519 private key; this service
holds only the public key. Claims: user id, workspace id, demo, plan
limits, expiry, unique id. Every run start, event stream connection, and
approval decision re-checks the token and that the run belongs to the
token's workspace.
"""

import base64
import json
import time

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import HTTPException, status


def _b64decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def verify_token(token: str, public_key_b64: str | None) -> dict:
    """Verify signature and expiry; return the claims or raise 401."""
    if not public_key_b64:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "RUNTIME_TOKEN_PUBLIC_KEY is not configured",
        )

    try:
        payload_b64, sig_b64 = token.split(".", 1)
        public_key = Ed25519PublicKey.from_public_bytes(_b64decode(public_key_b64))
        public_key.verify(_b64decode(sig_b64), _b64decode(payload_b64))
        claims = json.loads(_b64decode(payload_b64))
    except (ValueError, InvalidSignature, json.JSONDecodeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")

    if float(claims.get("exp", 0)) < time.time():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token expired")

    return claims
