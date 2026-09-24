# Security policy

Report privately to security@afhe.io; do not publish sensitive details in issues.

**Diagnostic preview — synthetic data only. The existing confidentiality release
gate remains blocked. Working arithmetic is not evidence that the processing
provider cannot recover inputs.**

The public package contains the connection adapter, not proprietary engine code,
native bindings, SDK parameter sets or key material. Engine remediation and
independent review remain prerequisites for real-data deployment. Removing
implementation details from GitHub does not clear that release gate.

MCP has no custom plaintext-input, decryption, secret-key or arbitrary-path tools.
The optional demo encrypts fixed public examples at the service. That service can
decrypt demonstration data and must not be presented as an owner-key-isolated
production deployment.

See [the privacy boundary](docs/SECURITY-MODEL.md). Tests do not confer production
sign-off. Earlier published revisions may remain in GitHub history and existing
copies after removal from the current tree.
