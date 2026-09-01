"""HTTP client for the Aura FHE coprocessor.

Standard-library only — no `requests`, no `httpx`. Works against any server
that speaks the Aura FHE HTTP protocol (see docs/PROTOCOL.md).
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, Optional, Sequence, Union
from urllib.parse import urlparse

Domain = str  # "int" | "float" | "string" | "binary"
Ciphertext = str

DEFAULT_BASE_URL = "https://localhost:8443"
DEFAULT_KEYS = {"skb": "file/skb", "pkb": "file/pkb", "dictb": "file/dictb"}


class AfheApiError(Exception):
    """Raised when the coprocessor returns a non-2xx response or the call fails at the network layer."""

    def __init__(self, message: str, status: int = 0, body: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.body = body

    def __str__(self) -> str:
        return f"AfheApiError(status={self.status}): {self.args[0]}"


@dataclass
class KeygenOptions:
    m: Optional[int] = None
    n: Optional[int] = None
    q: Optional[int] = None
    p: Optional[int] = None
    delta: Optional[float] = None
    skb_file: Optional[str] = None
    pkb_file: Optional[str] = None
    dictb_file: Optional[str] = None
    force: Optional[bool] = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class LoadOptions:
    skb: Optional[str] = None
    pkb: Optional[str] = None
    dictb: Optional[str] = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


@dataclass
class AfheClient:
    base_url: str
    timeout: float = 600.0
    headers: Mapping[str, str] = field(default_factory=dict)
    insecure_tls: bool = False

    def __post_init__(self) -> None:
        self.base_url = self.base_url.rstrip("/")
        if self.insecure_tls:
            self._ctx = ssl.create_default_context()
            self._ctx.check_hostname = False
            self._ctx.verify_mode = ssl.CERT_NONE
        else:
            self._ctx = ssl.create_default_context()

    # ---- low-level ---------------------------------------------------------

    def _request(self, method: str, path: str, body: Optional[dict] = None) -> Any:
        url = f"{self.base_url}{path}"
        data: Optional[bytes] = None
        req_headers = {"Accept": "application/json", **self.headers}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            req_headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url=url, data=data, method=method, headers=req_headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout, context=self._ctx) as resp:
                raw = resp.read()
                if not raw:
                    return None
                return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read() if hasattr(exc, "read") else b""
            parsed: Any = None
            try:
                parsed = json.loads(raw.decode("utf-8"))
            except Exception:
                parsed = raw.decode("utf-8", errors="replace")
            msg = (
                parsed["error"]
                if isinstance(parsed, dict) and "error" in parsed
                else f"HTTP {exc.code} from {path}"
            )
            raise AfheApiError(msg, status=exc.code, body=parsed) from None
        except urllib.error.URLError as exc:
            raise AfheApiError(f"network error: {exc.reason}", status=0, body=exc) from None

    # ---- discovery ---------------------------------------------------------

    def health(self) -> dict:
        return self._request("GET", "/health") or {}

    def functions(self) -> dict:
        return self._request("GET", "/functions") or {}

    # ---- lifecycle / keys --------------------------------------------------

    def init(self) -> dict:
        return self._request("POST", "/init", {}) or {}

    def keygen(self, opts: Union[KeygenOptions, dict, None] = None) -> dict:
        body = opts.to_dict() if isinstance(opts, KeygenOptions) else dict(opts or {})
        return self._request("POST", "/keygen", body) or {}

    def load(self, opts: Union[LoadOptions, dict]) -> dict:
        body = opts.to_dict() if isinstance(opts, LoadOptions) else dict(opts)
        return self._request("POST", "/load", body) or {}

    # ---- encrypt / decrypt -------------------------------------------------

    def encrypt(self, domain: Domain, value: Union[str, int, float], *, public: bool = False) -> Ciphertext:
        res = self._request("POST", f"/encrypt/{domain}", {"value": str(value), "public": public})
        return res["ciphertext"]

    def decrypt(self, domain: Domain, ciphertext: Ciphertext) -> str:
        res = self._request("POST", f"/decrypt/{domain}", {"ciphertext": ciphertext})
        return res["plaintext"]

    # ---- generic dispatch --------------------------------------------------

    def call(self, fn: str, args: Sequence[str]) -> str:
        res = self._request("POST", "/call", {"fn": fn, "args": list(args)})
        return res["result"]

    def verify(self, message: str, signature: str) -> bool:
        res = self._request("POST", "/verify", {"input": message, "sign": signature})
        return bool(res["valid"])

    # ---- typed helpers — encrypt (private key) ----------------------------

    def encrypt_int(self, v: Union[str, int]) -> Ciphertext: return self.encrypt("int", v)
    def encrypt_float(self, v: Union[str, float]) -> Ciphertext: return self.encrypt("float", v)
    def encrypt_string(self, v: str) -> Ciphertext: return self.encrypt("string", v)
    def encrypt_binary(self, v: Union[str, int]) -> Ciphertext: return self.encrypt("binary", v)

    # ---- encrypt (public key) ---------------------------------------------

    def encrypt_public_int(self, v): return self.encrypt("int", v, public=True)
    def encrypt_public_float(self, v): return self.encrypt("float", v, public=True)
    def encrypt_public_string(self, v): return self.encrypt("string", v, public=True)
    def encrypt_public_binary(self, v): return self.encrypt("binary", v, public=True)

    # ---- decrypt -----------------------------------------------------------

    def decrypt_int(self, c): return self.decrypt("int", c)
    def decrypt_float(self, c): return self.decrypt("float", c)
    def decrypt_string(self, c): return self.decrypt("string", c)
    def decrypt_binary(self, c): return self.decrypt("binary", c)

    # ---- int arithmetic ----------------------------------------------------

    def add_int(self, a, b): return self.call("AddCipherInt", [a, b])
    def sub_int(self, a, b): return self.call("SubstractCipherInt", [a, b])
    def mul_int(self, a, b): return self.call("MultiplyCipherInt", [a, b])
    def div_int(self, a, b): return self.call("DivideCipherInt", [a, b])
    def mod_int(self, a, b): return self.call("ModCipherInt", [a, b])
    def compare_int(self, a, b): return self.call("CompareCipherInt", [a, b])
    def map_int(self, a): return self.call("MapCipherInt", [a])

    # ---- float arithmetic --------------------------------------------------

    def add_float(self, a, b): return self.call("AddCipherFloat", [a, b])
    def sub_float(self, a, b): return self.call("SubstractCipherFloat", [a, b])
    def mul_float(self, a, b): return self.call("MultiplyCipherFloat", [a, b])
    def div_float(self, a, b): return self.call("DivideCipherFloat", [a, b])

    # ---- bitwise / shift / rotate / cmux (binary, DictB) -------------------

    def xor(self, a, b): return self.call("XORCipher", [a, b])
    def and_(self, a, b): return self.call("ANDCipher", [a, b])
    def or_(self, a, b): return self.call("ORCipher", [a, b])
    def not_(self, a): return self.call("NOTCipher", [a])
    def shift_left(self, c, bias): return self.call("ShiftLeft", [c, str(bias)])
    def shift_right(self, c, bias): return self.call("ShiftRight", [c, str(bias)])
    def rotate_left(self, c, bias): return self.call("RotateLeft", [c, str(bias)])
    def rotate_right(self, c, bias): return self.call("RotateRight", [c, str(bias)])
    def cmux(self, sel, a, b): return self.call("CMux", [sel, a, b])

    # ---- cross-type --------------------------------------------------------

    def compare(self, a, b): return self.call("Compare", [a, b])
    def abs(self, c): return self.call("ABSCipher", [c])

    # ---- string ops --------------------------------------------------------

    def concat_string(self, a, b): return self.call("ConcatString", [a, b])
    def substring(self, s, start, end): return self.call("Substring", [s, str(start), str(end)])
    def to_upper(self, s): return self.call("ToUpperCipherString", [s])
    def to_lower(self, s): return self.call("ToLowerCipherString", [s])
    def map_sm3(self, s): return self.call("MapSm3CipherString", [s])

    # ---- scientific (float, PKB + DictB) ----------------------------------

    def power(self, c, n, m): return self.call("PowerCipher", [c, str(n), str(m)])
    def sqrt(self, c): return self.call("SqrtCipher", [c])
    def log(self, c): return self.call("LogCipher", [c])
    def exp(self, c): return self.call("ExpCipher", [c])
    def sin(self, c): return self.call("SinCipher", [c])
    def cos(self, c): return self.call("CosCipher", [c])
    def tan(self, c): return self.call("TanCipher", [c])
    def asin(self, c): return self.call("AsinCipher", [c])
    def acos(self, c): return self.call("AcosCipher", [c])
    def atan(self, c): return self.call("AtanCipher", [c])
    def sinh(self, c): return self.call("SinhCipher", [c])
    def cosh(self, c): return self.call("CoshCipher", [c])
    def tanh(self, c): return self.call("TanhCipher", [c])
    def asinh(self, c): return self.call("AsinhCipher", [c])
    def acosh(self, c): return self.call("AcoshCipher", [c])
    def atanh(self, c): return self.call("AtanhCipher", [c])

    # ---- signing -----------------------------------------------------------

    def sign(self, message: str) -> str:
        return self.call("GenSign", [message])


# ---------------------------------------------------------------------------
# connect()
# ---------------------------------------------------------------------------


def connect(
    base_url: Optional[str] = None,
    *,
    insecure_tls: Optional[bool] = None,
    auto_load: bool = True,
    keys: Optional[Mapping[str, str]] = None,
    health_check: bool = True,
    timeout: float = 600.0,
    headers: Optional[Mapping[str, str]] = None,
) -> AfheClient:
    """Connect to an Aura FHE coprocessor and return a ready-to-use client.

    Reads ``$AFHE_API_URL`` from the environment when ``base_url`` is ``None``.
    Relaxes TLS for localhost and genesis (``api.afhe.io``).
    """
    url = base_url or os.getenv("AFHE_API_URL") or DEFAULT_BASE_URL
    if insecure_tls is None:
        insecure_tls = _trust_tls(url)

    client = AfheClient(
        base_url=url,
        timeout=timeout,
        headers=dict(headers or {}),
        insecure_tls=bool(insecure_tls),
    )

    if health_check:
        try:
            status = client.health().get("status")
        except AfheApiError as exc:
            raise AfheApiError(
                f"cannot reach Aura FHE coprocessor at {url}: {exc}", status=0, body=exc
            ) from None
        if status != "ok":
            raise AfheApiError(
                f"coprocessor at {url} returned unhealthy status: {status!r}",
                status=0,
                body=status,
            )

    if auto_load:
        merged = dict(DEFAULT_KEYS)
        if keys:
            merged.update({k: v for k, v in keys.items() if v})
        client.load(LoadOptions(**merged))

    return client


def _trust_tls(rawurl: str) -> bool:
    try:
        host = urlparse(rawurl).hostname or ""
    except Exception:
        return False
    return host in {"localhost", "127.0.0.1", "::1", "api.afhe.io"} or host.endswith(".localhost")
