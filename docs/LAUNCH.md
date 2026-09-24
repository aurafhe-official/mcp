# Release gate

`release-status.json` preserves diagnostic-preview status,
`productionReady:false` and `confidentialityGate:"blocked"`.

Review and test the PR using the GitHub branch instructions. This change does not
publish to npm, deploy hosted MCP/OAuth or authorize a production privacy release.
Clear the engine confidentiality gate and validate the owner/backend/recipient
boundary before sensitive-data use. [Security model](SECURITY-MODEL.md) ·
[Verification](VERIFICATION.md).
