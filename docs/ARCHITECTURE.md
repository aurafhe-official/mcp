# Architecture

FHE is the computation layer. MCP is the connection layer; application workflows
compose the exposed operations. These layers have separate acceptance criteria.

```text
MCP host -> local public adapter -> HTTPS -> Aura coprocessor
                |                              private engine
         encrypted result file
                |
      separately authorized recipient
```

The adapter owns validation, process-local handles, HTTPS requests and encrypted
artifact I/O. The service owns computation. Owner/recipient integrations are
external; no native worker, engine parameters or private build identifiers are
distributed. [Privacy boundary](SECURITY-MODEL.md).

The default connection can start and list tools without provisioning. The optional
demo provisions fixed public examples. Bundle mode reads one operator-configured
encrypted file and requires an authenticated matching compute-only worker.

Neither available mode is called Verified. Guided onboarding (`aura_start`),
roadmap (`aura_roadmap`) and evidence status (`aura_proof`) make that distinction
visible to the agent. A production client/server split requires real owner-side
cryptography and evaluated server enforcement, not merely a new mode flag.
