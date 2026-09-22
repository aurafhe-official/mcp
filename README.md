# AURA MCP

A minimal MCP client for encrypted computation through Aura's authenticated
coprocessor. The public package contains tool definitions, reference validation,
HTTPS transport and client tests. The computation engine stays in Aura's private
service.

**Integration candidate:** the service contract in this branch must be implemented
or mapped by the private coprocessor gateway before deployment. Client tests use
contract fixtures; they do not establish live-service compatibility or production
cryptographic security. This candidate does not fall back to a local engine or
the legacy plaintext API.

```text
Owner application: encrypt and provision data
        ↓ encrypted dataset reference
Agent → AURA MCP client → authenticated Aura coprocessor
        ↑ encrypted result reference
Authorized recipient: retrieve and decrypt outside model context
```

## Public tools

| Tool | Purpose |
| --- | --- |
| `fhe_status` | Check the authenticated service session |
| `fhe_ops` | List public operations enabled by the service |
| `fhe_import` | Open a previously encrypted dataset by reference |
| `fhe_compute` | Request remote computation on this session's handles |
| `fhe_export` | Obtain an encrypted result reference for the recipient |
| `fhe_release` | Release this session's references |

The model receives handles, operation metadata and result references. No tools
accept source plaintext, credentials, key files, raw engine functions or internal
paths. The package contains no cryptographic implementation, native libraries,
key-generation tooling, engine parameters or internal evaluation recipes.

## Configuration

Provision the gateway endpoint, service credential and authorized key reference
outside the model. See [Setup](docs/QUICKSTART.md) and the [public service contract](docs/PROTOCOL.md).
HTTPS certificate verification is mandatory. Shared inbound HTTP is not exposed
by this package; each stdio connection opens its own service session.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:package
```

[Privacy boundary](docs/SECURITY-MODEL.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Migration](docs/MIGRATION.md) · [Validation](docs/VERIFICATION.md)

The engine can remain proprietary while ciphertext computation is offered through
an API. Data privacy additionally depends on owner-side encryption, recipient-side
decryption, backend authorization and the security of the deployed cryptosystem.
Sending source values or secret keys to the compute service would change that
privacy boundary. Keeping source code private alone does not establish it.
