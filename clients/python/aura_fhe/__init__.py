"""aura_fhe — Python client for the Aura FHE coprocessor.

Quickstart:

    from aura_fhe import connect

    fhe = connect()                              # localhost:8443; genesis via $AFHE_API_URL
    a   = fhe.encrypt_int(25)
    b   = fhe.encrypt_int(17)
    print(fhe.decrypt_int(fhe.add_int(a, b)))    # "42"

Zero third-party dependencies. Standard library only.
"""

from .client import (
    AfheClient,
    AfheApiError,
    KeygenOptions,
    LoadOptions,
    connect,
)

__all__ = [
    "AfheClient",
    "AfheApiError",
    "KeygenOptions",
    "LoadOptions",
    "connect",
]

__version__ = "0.3.0"
