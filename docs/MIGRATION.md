# Migration

This candidate replaces earlier remote-plaintext and local-engine experiments
with a minimal coprocessor client. Do not deploy it until the private gateway
implements the documented contract and the full owner-to-recipient flow passes.

- Remove legacy hosted plaintext, local engine and key-directory settings.
- Provision the HTTPS gateway, protected service token and authorized key reference.
- Keep source data ingestion/encryption and recipient decryption outside the model.
- Use opaque dataset references, session handles and encrypted result references.
- Pin the reviewed commit and restart the MCP process during upgrades.

There are no encryption, decryption, automatic reveal, arbitrary native-function
or shared inbound HTTP tools. The public package does not distribute owner-side
cryptography tooling. The private gateway must enforce ownership and key lifecycle
regardless of any checks performed by this client.

Removal from a current branch or package does not erase previous GitHub commits,
PR revisions, caches or downloaded copies. Repository-history cleanup, if needed,
is a separate administrative operation and must not be represented as complete
merely because the latest tree is smaller.
