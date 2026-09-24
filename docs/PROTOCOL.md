# Public adapter interface

The adapter uses the deployed REST API: `GET /health`, `GET /functions` and
ciphertext-only `POST /call`. Fixed demo preparation also uses
`POST /encrypt/int` and `/encrypt/float` with five hard-coded public examples.
No MCP tool loads keys, initializes the engine, decrypts or dispatches arbitrary
functions. Engine implementation remains private.

| MCP tool | Arguments | Result |
| --- | --- | --- |
| `aura_start` | none | Mode, read-this-first notes, connectivity, operations and next steps |
| `aura_roadmap` | none | Current primitives, compositions, planned work and application contact |
| `aura_proof` | none | Evidence status; no cryptographic proof or certification |
| `fhe_status` | none | Reachability, mode, configuration and release status |
| `fhe_ops` | none | Supported operations intersected with service discovery |
| `fhe_inputs` | none | Local handles, indexes, domains and expiry |
| `fhe_compute` | `op`, `handles` | Result handle, domain and expiry |
| `fhe_export` | `handle` | Encrypted result ID and domain |
| `fhe_release` | `handles` | Number of forgotten handles |

Successful tool payloads and handled operation errors include `mode` as
`fixed-synthetic-demo`, `operator-bundle` or `unconfigured`, with
`confidentialityClaimed: false`, `confidentialityVerified: false` and
`productionReady: false`. Framework-level schema errors can precede tool handling.
`aura_start` is a connectivity/onboarding call, not an arithmetic proof.
`aura_proof` explicitly marks missing evidence rather than returning a pass.

`fhe_compute` also returns `metrics`: client elapsed milliseconds (worker checks,
network and evaluation combined), output ciphertext bytes, number of remote
binary calls, and an integer/approximate precision class. It does not measure
engine-only time or decrypt to check error; `accuracyVerified` is false.
The separate live verifier reports actual numerical error for synthetic cases.

Domains: `int`, `float`. Operations: `add`, `sub`, `mul`, `div`.
Addition/multiplication accept 2–128 handles; subtraction/division require two.
Operands must share a domain. Integer division follows backend semantics; floats
are approximate. The adapter cannot inspect encrypted divisors or prove ranges
and computation depth are safe. No comparison, scientific, string, binary, SQL,
retrieval or model-inference capability is claimed by this preview.

Handles expire after 30 minutes and belong to one process. Derived results inherit
the earliest input expiry. Bounds: one active operation, 120 tool calls/minute,
512 handles, 32 MiB stored ciphertext, 4 MiB network responses and 30-second
request timeout. Cancellation reaches pending network calls. Redirects and TLS
bypass are rejected; backend diagnostics do not appear in tool errors.

## Encrypted files

An external owner integration supplies the operator-configured JSON bundle:

```json
{"version":1,"keyId":"owner-key-reference","inputs":[{"domain":"int","ciphertext":"OPAQUE_CIPHERTEXT"},{"domain":"int","ciphertext":"OPAQUE_CIPHERTEXT"}]}
```

Placeholders are not working ciphertexts. Maximum bundle: 16 MiB, 1–128 inputs,
2 MiB per ciphertext. Extra fields are rejected. Ciphertext is opaque to the
adapter; it cannot verify correct encryption. The key ID is a routing tag, not
authentication. Private backend policies must enforce credential/key/operation
ownership and isolation.

Exports retain the version 1 recipient envelope:

```json
{"version":1,"keyId":"owner-key-reference","resultId":"ct_00000000000000000000000000000000","domain":"int","ciphertext":"OPAQUE_CIPHERTEXT","operation":"add"}
```

Only computed handles can be exported. Files are created under the operator's
configured directory and never overwritten. Tools return IDs, not contents or
directory paths. Expiry and release do not delete exported files; the recipient
controls retention and decryption separately.

## Modes

The default connection checks service status and operations without configuration.
Computing an operator bundle requires a credential and the matching compute-only
worker declaration. Metadata does not establish cryptographic confidentiality.

`--demo` uses fixed public examples and the hosted API's existing key setup.
It cannot load an owner bundle. The standalone synthetic verifier decrypts only
its own demo artifacts outside MCP. The confidentiality release gate remains
blocked in both modes.

The previous draft-only `aura-coprocessor/1` session gateway is not required or
asserted to be deployed. This version uses the existing REST API. A Verified-mode
client, public-key session provisioning, WASM client and traffic journal are not
shipped. `/health` metadata cannot establish their existence or security.
