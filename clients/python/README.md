# aura-fhe — Python client

Standard library only. Single import. Works against any server that speaks the
Aura FHE protocol (`docs/PROTOCOL.md`).

```bash
pip install aura-fhe
```

```python
from aura_fhe import connect

fhe = connect()                              # localhost:8443; genesis via $AFHE_API_URL
a   = fhe.encrypt_int(25)
b   = fhe.encrypt_int(17)
print(fhe.decrypt_int(fhe.add_int(a, b)))    # "42"
```

## `connect(...)`

| Arg | Default | Notes |
|---|---|---|
| `base_url` | `$AFHE_API_URL` or `https://localhost:8443` | Server URL |
| `insecure_tls` | `True` for localhost and `api.afhe.io` | Pass `True` to accept self-signed certs on other hosts |
| `auto_load` | `True` | Server-side `POST /load` with the standard key paths |
| `keys` | `{"skb": "file/skb", "pkb": "file/pkb", "dictb": "file/dictb"}` | Override individual paths |
| `health_check` | `True` | Probe `GET /health` before returning |
| `timeout` | `600.0` | Per-request timeout (seconds) |
| `headers` | – | Extra headers sent on every request |

## Full control

```python
from aura_fhe import AfheClient, LoadOptions

fhe = AfheClient(
    base_url="https://api.example.com:8443",
    timeout=30.0,
    headers={"X-Tenant": "acme"},
    insecure_tls=False,
)
fhe.load(LoadOptions(skb="/etc/afhe/skb", pkb="/etc/afhe/pkb", dictb="/etc/afhe/dictb"))
```

## Surface

| Group | Methods |
|---|---|
| Discovery | `health`, `functions` |
| Lifecycle | `init`, `keygen`, `load` |
| Encrypt (private) | `encrypt_int`, `encrypt_float`, `encrypt_string`, `encrypt_binary` |
| Encrypt (public)  | `encrypt_public_int`, `encrypt_public_float`, `encrypt_public_string`, `encrypt_public_binary` |
| Decrypt | `decrypt_int`, `decrypt_float`, `decrypt_string`, `decrypt_binary` |
| Int arith | `add_int`, `sub_int`, `mul_int`, `div_int`, `mod_int`, `compare_int`, `map_int` |
| Float arith | `add_float`, `sub_float`, `mul_float`, `div_float` |
| Bitwise | `xor`, `and_`, `or_`, `not_` |
| Shift / rotate / mux | `shift_left`, `shift_right`, `rotate_left`, `rotate_right`, `cmux` |
| Cross-type | `compare`, `abs` |
| String | `concat_string`, `substring`, `to_upper`, `to_lower`, `map_sm3` |
| Scientific | `sqrt`, `log`, `exp`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `power` |
| Sign / verify | `sign`, `verify` |
| Escape hatch | `call(fn, args)` |

> Note: `and`, `or`, `not` are Python reserved words, so the methods are spelled
> `and_`, `or_`, `not_`.

## Errors

```python
from aura_fhe import connect, AfheApiError

try:
    fhe = connect()
    fhe.call("NotARealFunction", [])
except AfheApiError as e:
    print(f"HTTP {e.status}: {e}")
    print("body:", e.body)
```

## License

MIT
