# Proposed public coprocessor contract

**This is a client integration contract, not a claim that these actions are
already deployed.** The private backend must implement or map this boundary.
Its implementation and internal operation mappings do not belong in this repo.

All requests use POST to one configured HTTPS endpoint, a bearer credential in
the Authorization header, and JSON. The endpoint cannot come from model inputs.

```json
{
  "protocol": "aura-coprocessor/1",
  "requestId": "<unique-request-id>",
  "action": "compute",
  "payload": {
    "sessionId": "<opaque-session-id>",
    "key": { "id": "<opaque-key-id>", "version": 1 },
    "op": "add",
    "domain": "int",
    "objectIds": ["<opaque-reference-a>", "<opaque-reference-b>"]
  }
}
```

Successful responses contain exactly `protocol`, the matching `requestId`, and
`result`. Failures use non-2xx status codes. Backend error bodies and additional
internal fields are never forwarded to the MCP client. See `src/contracts.ts`
for strict public response schemas.

| Action | Payload beyond session/key scope | Result |
| --- | --- | --- |
| `session.open` | `key` only; credential authenticates the caller | Session ID, authorized key, expiry, public capabilities |
| `session.status` | None | Scope and `ready` |
| `dataset.import` | `datasetId` | Scope and bounded opaque object references with domain/expiry |
| `compute` | Public `op`, `domain`, `objectIds` | Scope and one encrypted object reference |
| `result.export` | `objectId`, requested `expiresAt` | Scope, opaque `resultId`, expiry no later than requested |
| `objects.release` | `objectIds` | Scope and released count |

Each action after open carries the session and key reference. The **server** must
authenticate and authorize every action and resource against the credential;
matching identifiers supplied by the client are not authorization. Use constant
error behavior for unavailable/unauthorized resources. Revocation and expiry must
be enforced server-side. A result reference must not be a publicly usable download
URL or a standalone authorization capability.

Capabilities describe public operation/domain and min/max arity only. The initial
client permits int add/sub/mul, float add/sub/mul/mean, and string concat, and only
those enabled by the gateway. Unsupported aliases, internal function names,
comparisons that disclose data and arbitrary raw dispatch are not accepted.
This is an API allowlist, not a statement that every operation is deployed or has
passed live-engine validation. Arithmetic ranges and precision must be agreed and
validated with the service before release; no internal parameter values are
published here.

Responses carry references, not ciphertext payloads, plaintext, key material,
engine versions, internal filesystem locations or diagnostics. Opaque identifiers
are 16–128 ASCII letters/digits/underscore/hyphen. Sessions last at most 24 hours;
local handles last at most 30 minutes and never outlive their source/session.
The server must implement idempotency or safe duplicate handling using request
IDs; the client does not automatically retry mutating requests.

The adapter bounds MCP messages to 64 KiB, service responses to 1 MiB, operation
inputs to 128 and local handles to 2,048. It permits one outstanding operation
and 120 calls per minute per connection, with a 30-second request timeout and
abort propagation. The service needs independent quotas, cancellation policy,
tenant isolation and audit controls; aborting a client request alone cannot prove
remote work stopped. Restart invalidates local handles; re-import authorized
datasets through a new session.
