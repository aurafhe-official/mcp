# Architecture

The MCP package is a thin authenticated client. A stdio connection receives a
client session, opens a corresponding service session, and routes all dataset,
computation, export and release work to the configured Aura gateway. Computation
never runs locally and there is no alternate native backend.

Only the public operation name and opaque authorized references cross this API.
The private service translates that request into its internal execution. The
MCP keeps random local handles so internal object references are not exposed to
the model. Strict response schemas keep backend diagnostics and extra fields out
of tool results. No process is spawned to execute engine code or read key files.

The private gateway and owner/recipient applications are required integration
components. Their current endpoint/authorization contract must be verified or
adapted to the proposed public contract before this candidate is deployed.
