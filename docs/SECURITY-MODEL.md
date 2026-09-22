# Privacy and disclosure boundary

## Public client

The public repository contains the MCP interface, HTTPS client, public request
and response validation, opaque-handle lifecycle and contract tests. It does not
contain the engine implementation, native bindings, evaluation algorithms, key
generation, parameter sets, binary fingerprints, private deployment configuration
or engine verification artifacts.

The model receives only documented public operations, dataset/handle/result
references, domains and expiry/readiness metadata. It can still observe operation
and timing patterns. The client does not print credentials, raw server responses,
internal error messages, ciphertext bytes or diagnostic logs.

## Private service

Aura's private coprocessor owns execution and engine integration. Its gateway must
enforce authenticated principal/session/key/resource binding, revocation, quotas,
encrypted result delivery and safe error handling. Client handle scoping is
additional protection, not a replacement for backend authorization. Credentials
must be provisioned outside model context.

The private service may disclose the stable API needed by clients without
publishing its computation implementation. Privacy/security evaluation can be
performed confidentially; it does not require putting proprietary source into
this public repository.

## Data owners and recipients

To claim that the model and compute infrastructure do not receive source plaintext
or secret decryption keys, encryption must occur in the owner's controlled
environment and decryption at the authorized recipient. Their tools must also be
inaccessible through the model's other filesystem/shell integrations. Merely
moving plaintext encryption/decryption behind an HTTPS endpoint does not create
that stronger boundary.

This client performs no encryption or decryption. Owner-side provisioning and
recipient-side opening are separate service integrations. Result integrity,
permitted output policy, evaluation-material security and cryptographic security
must be established for the complete deployed system. These are not inferred from
passing client contract tests or from keeping an implementation proprietary.
