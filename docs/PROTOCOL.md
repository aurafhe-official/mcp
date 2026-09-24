# aura-coprocessor/1

Wire contract between an owner-side client (this MCP, a CLI, or a WASM module) and a blind coprocessor. Ciphertext strings are opaque to the client; only the engine interprets them.

## Guarantees the server must uphold
1. No endpoint accepts, loads or generates a secret key for user sessions.
2. No endpoint returns plaintext derived from user ciphertext. `/encrypt` and `/decrypt` must not exist for user sessions (404).
3. `/health` reports `secretKeyLoaded: false`, `role: "compute"` and the true op list.
4. TLS on 443. Clients refuse `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Endpoints

`GET /health` -> `{ status:"ok", protocol:"aura-coprocessor/1", role:"compute", secretKeyLoaded:false, engine, scheme, ops:[...] }`

`GET /params` -> public encryption parameters. Clients pin them and refuse anything below 128-bit.
Reference: `{ scheme:"ckks", polyModulusDegree:8192, coeffModulusBits:[60,40,40,60], scaleBits:40, securityLevel:128 }`
Aura engine: publish its own parameter object; the client's `ClientCrypto` implementation consumes it.

`POST /session` `{ fingerprint, evaluationKeys:{ relin, ... } }` -> `{ sessionId }`
Registers PUBLIC evaluation material only. One session per key fingerprint per process.

`POST /eval` `{ sessionId, op, args:[ciphertext...], plain?:[number...] }` -> `{ result: ciphertext, engineMs, level? }`
- `add | sum`: n >= 2 ciphertexts
- `sub`: exactly 2
- `mul`: n >= 2
- `scale`: 1 ciphertext, `plain:[k]`
- `weighted_sum`: n ciphertexts, `plain` of length n
- `div`, `compare`, `max`: Aura engine only; `compare` returns an encrypted -1/0/1, `max` an encrypted value
Errors: 400 bad request, 401 unknown session, 422 operation unavailable, 429 rate limited.

## Target client obligations (not all satisfied by this reference)
- Generate and store the secret key locally (mode 600); never serialize it into a request.
- Journal every request before sending; expose the journal to the user.
- Refuse to reveal raw sealed inputs to the agent; reveal computed results only, with a local plaintext cross-check.

Current implementation gaps and platform limitations are documented in [REVIEW.md](REVIEW.md). In particular, the current journal records after responses, not before transmission.
