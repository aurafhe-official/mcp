# Architecture

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

The owner runtime holds SKB and receives plaintext only on the owner's loopback interface. The owner CLI writes an encrypted input bundle. The MCP process receives that bundle and compute-only credentials, creates random session handles, and dispatches approved numeric operations. The compute runtime loads PKB and DictB only. Encrypted results return to an owner-selected output directory; only the separate owner application decrypts them.

The MCP cannot prevent a shell-enabled host from reading other local files. Enforce the boundary with separate machines, OS identities or restricted mounts. Never mount the owner secret or plaintext directory in the MCP or worker environment. Route and credential separation do not fix the blocked native-engine confidentiality gate.

One process owns one key context and session. Handles expire after one hour. HTTP MCP mode is disabled until authenticated session isolation is implemented. See [setup](QUICKSTART.md) and [security policy](../SECURITY.md).
