"""Smoke tests against a live coprocessor.

Run with the coprocessor available at $AFHE_API_URL (defaults to localhost:8443):

    pytest -v
"""

import os
import pytest
from aura_fhe import AfheApiError, connect


def _have_server() -> bool:
    try:
        connect()
        return True
    except AfheApiError:
        return False


pytestmark = pytest.mark.skipif(not _have_server(), reason="no coprocessor reachable")


def test_health():
    fhe = connect()
    assert fhe.health()["status"] == "ok"


def test_int_roundtrip():
    fhe = connect()
    for v in (0, 1, 2, 3, 4):
        ct = fhe.encrypt_int(v)
        assert fhe.decrypt_int(ct) == str(v)


def test_binary_xor():
    fhe = connect()
    a = fhe.encrypt_binary(25)
    b = fhe.encrypt_binary(10)
    assert fhe.decrypt_binary(fhe.xor(a, b)) == str(25 ^ 10)


def test_unknown_fn_raises():
    fhe = connect()
    with pytest.raises(AfheApiError) as exc_info:
        fhe.call("NotARealFunction", ["x"])
    assert exc_info.value.status == 400
