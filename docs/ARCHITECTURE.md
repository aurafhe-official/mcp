# Architecture

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
