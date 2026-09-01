# Security policy

## Reporting a vulnerability

Email **security@afhe.io** with the details.

Please do not open public issues for security reports.

## MCP server

`npx -y github:aurafhe-official/mcp` (or `@aurafhe/mcp` after npm) is an MCP server. Do not put secret key material in MCP env vars or chat. `AFHE_API_KEY` is an access token for the backend HTTP API, not the FHE secret.

Handles (`ct_…`) live in the MCP process. Ciphertext does not have to round-trip through the prompt. Reveal (`fhe_decrypt` / `reveal: true`) is the only step that returns plaintext to the model.

## Threat model

| Asset | Held by | Trust assumption |
|---|---|---|
| **SKB** | Data owner | Anyone with it can decrypt ciphertexts created under that key. |
| **PKB** | Compute side | Public-key material. |
| **DictB** | Compute side | Evaluation material for homomorphic compute. |
| Ciphertexts / MCP handles | Either side | Opaque without the SKB. |
| Network channel | Public | Use TLS for transport confidentiality and integrity. |

## What FHE protects

- plaintext values
- encrypted intermediate state
- encrypted outputs
- the agent's prompt, when you keep values sealed and only reveal the final result

## What FHE does not protect by itself

- which operations were called
- timing and other side channels
- compromised endpoints
- ciphertext authenticity or freshness

Use signatures where authenticity matters.

## Operational reminders

- never share `SKB`
- rotate keys deliberately
- treat shared or demo key material as non-production
- back up `SKB` securely
