# Protocol

This MCP server talks JSON over HTTPS to the AURA network. The contract is below.

Production network: `https://api.afhe.io:8443`. Local operators: `https://localhost:8443`.

---

## `GET /health`

Liveness probe.

```http
GET /health
```
```json
{ "status": "ok" }
```

---

## `GET /functions`

List every operation accepted by `POST /call`, grouped by arity.

```http
GET /functions
```
```json
{
  "arity1": ["EncryptInt", "DecryptInt", "NOTCipher", "ABSCipher", ...],
  "arity2": ["AddCipherInt", "AddCipherFloat", "XORCipher", "CompareCipherInt", ...],
  "arity3": ["CMux", "Substring", "PowerCipher", ...]
}
```

---

## `POST /init`

Idempotent. The server auto-initialises on first request; this endpoint is rarely
needed and is exposed only for diagnostics.

```http
POST /init
```
```json
{ "ok": true }
```

---

## `POST /keygen`

Generate a fresh SKB + PKB + DictB key triplet on the server. Slow on first run
(minutes); subsequent runs are skipped unless `force: true`.

```http
POST /keygen
Content-Type: application/json

{
  "m": 65537,
  "n": 1024,
  "q": 15,
  "p": 512,
  "delta": 0,
  "skb_file":  "file/skb",
  "pkb_file":  "file/pkb",
  "dictb_file":"file/dictb",
  "force": false
}
```
```json
{
  "skipped": false,
  "skb_file":  "file/skb",
  "pkb_file":  "file/pkb",
  "dictb_file":"file/dictb"
}
```

> Some server builds (in particular `keyxx-core-c`) do not support keygen and
> will return `500`. In that case, generate keys with the reference toolchain
> and place them on disk before calling `POST /load`.

---

## `POST /load`

Load one or more key blocks into the running server.

```http
POST /load
Content-Type: application/json

{
  "skb":   "file/skb",
  "pkb":   "file/pkb",
  "dictb": "file/dictb"
}
```
```json
{ "loaded": ["skb", "pkb", "dictb"] }
```

| Field | Required for | Notes |
|---|---|---|
| `skb`   | Private-key encrypt, decrypt, sign | The data owner's key — keep it private |
| `pkb`   | Public-key encrypt, scientific ops | Public |
| `dictb` | Any homomorphic computation        | Public |

Paths are interpreted **on the server**.

---

## `POST /encrypt/{domain}`

Encrypt a plaintext value. `domain` is one of `int`, `float`, `binary`, `string`.

```http
POST /encrypt/int
Content-Type: application/json

{ "value": "25", "public": false }
```
```json
{ "ciphertext": "<opaque ASCII ciphertext>" }
```

`public: true` switches from the private-key encryptor (needs SKB) to the
public-key encryptor (needs PKB).

---

## `POST /decrypt/{domain}`

Decrypt a ciphertext. Needs the SKB loaded.

```http
POST /decrypt/int
Content-Type: application/json

{ "ciphertext": "<opaque ASCII ciphertext>" }
```
```json
{ "plaintext": "25" }
```

---

## `POST /call`

The canonical generic dispatcher. Every operation listed by `GET /functions`
is callable here.

```http
POST /call
Content-Type: application/json

{ "fn": "AddCipherInt", "args": ["<ct-a>", "<ct-b>"] }
```
```json
{ "result": "<opaque ciphertext>" }
```

The `result` is a ciphertext for compute operations, a plaintext string for
comparisons / fingerprints (`CompareCipherInt`, `MapCipherInt`, `BitwiseMap`,
…), or a signature for `GenSign`.

### Operations grouped by arity and domain

```
arity 1:  EncryptInt(value)        EncryptFloat(value)      EncryptString(value)     EncryptBinary(value)
          DecryptInt(ct)           DecryptFloat(ct)         DecryptString(ct)        DecryptBinary(ct)
          NOTCipher(ct)            ABSCipher(ct)
          SqrtCipher(ct)           LogCipher(ct)            ExpCipher(ct)
          SinCipher(ct)            CosCipher(ct)            TanCipher(ct)             ...
          MapCipherInt(ct)         BitwiseCount(ct)         BitwiseMap(ct)
          ToUpperCipherString(ct)  ToLowerCipherString(ct)  MapSm3CipherString(ct)
          GenSign(msg)

arity 2:  AddCipherInt(a,b)        AddCipherFloat(a,b)
          SubstractCipherInt(a,b)  SubstractCipherFloat(a,b)
          MultiplyCipherInt(a,b)   MultiplyCipherFloat(a,b)
          DivideCipherInt(a,b)     DivideCipherFloat(a,b)
          ModCipherInt(a,b)        CompareCipherInt(a,b)    CompareCipherString(a,b)
          XORCipher(a,b)           ANDCipher(a,b)           ORCipher(a,b)
          ShiftLeft(a,bias)        ShiftRight(a,bias)
          RotateLeft(a,bias)       RotateRight(a,bias)
          ConcatString(a,b)        EqualBinary(a,b)
          ChangeBinary2Int(a)      ChangeBinary2Float(a)    ChangeInt2Binary(a)

arity 3:  CMux(sel, a, b)          Substring(s, start, end) PowerCipher(c, n, m)
```

---

## `POST /verify`

```http
POST /verify
Content-Type: application/json

{ "input": "the message", "sign": "the signature returned by GenSign" }
```
```json
{ "valid": true }
```

---

## Error format

Non-2xx responses always return:

```json
{ "error": "<human-readable message>" }
```

| Status | Cause |
|---|---|
| `400` | Unknown function, wrong arity, malformed JSON, invalid domain |
| `404` | Unknown route |
| `405` | Method not allowed |
| `500` | Server error — keys not loaded, server build does not support the op, etc. |

---

## TLS

Production deployments terminate TLS at the server. This MCP trusts genesis (`api.afhe.io`) and localhost. For other hosts, install a real certificate or set `AFHE_INSECURE_TLS=1`.

---

## Versioning

The protocol is versioned by `GET /health` payloads (an upcoming `version`
field). Clients in this repo never break against a server with a newer minor
version — added endpoints / functions are simply not exercised.
