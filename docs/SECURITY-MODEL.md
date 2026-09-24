# Privacy boundary

The intended private workflow is owner-side encryption, remote ciphertext
computation and recipient-side decryption. This public adapter implements the
connection and handle portion. Owner tooling, service key custody and cryptography
are external dependencies.

The hosted synthetic demo uses backend encryption and decryption. It verifies
functionality, not infrastructure blindness. TLS protects the connection; it does
not prove that the service cannot recover plaintext. The existing confidentiality
gate remains blocked until the engine and complete architecture receive independent
review. No engine details need to be published to state that limit accurately.

Client controls include verified HTTPS, optional bearer authentication (required
for bundle mode), response validation, operation allowlisting, per-process random
handles, expiry, bounds, cancellation and sanitized errors. A matching compute-only
worker declaration is required for bundle computation. A server can misreport its
role: metadata and key IDs are not cryptographic assurance. The private service
must enforce principal/key/operation ownership and isolation.

One stdio process serves one operator context. No shared inbound HTTP service or
multi-tenant authorization layer is provided. Processes alone do not isolate
owner files when OS permissions are shared. Keep owner data, keys and decryption
credentials inaccessible to the model's other tools; protect exported ciphertext.

Before sensitive-data use: clear the engine confidentiality gate; verify owner-only
secret-key custody and owner/recipient encryption/decryption; enforce backend
authorization and two-owner isolation; test tampering, revocation and key rotation;
establish arithmetic ranges, depth, service limits and recipient disclosure policy.
Repository tests cover the adapter and bounded synthetic computations, not those
production assurances.
