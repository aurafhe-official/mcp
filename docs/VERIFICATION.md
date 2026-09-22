# Validation status

This candidate validates the public client's transport and reference-handling
contract with fixtures. It does not include engine implementation tests or private
engine evidence in the public package.

Run `npm test` and `npm run test:package`. The suite checks mandatory HTTPS and
authentication, fixed endpoint routing, redirect rejection, response size limits,
timeouts, cancellation, scope/expiry checks, cross-connection handles, operation
arity, strict tool arguments and suppression of internal errors. Packaging tests
enforce an explicit inventory of public files. CI runs these checks on Windows
and Ubuntu with Node 20, 22 and 24.

Before release, the private integration must verify:

1. Actual gateway compatibility and a valid TLS configuration.
2. Principal/key ownership and adversarial cross-tenant/revoked-access denial.
3. Owner-side encrypted ingestion, ciphertext-only remote evaluation and
   authorized recipient-side decryption through a real MCP client.
4. Operation correctness, arithmetic range and precision on the deployed service.
5. Required cryptographic assurance and operational controls for advertised claims.

Passing the public client tests does not establish these service properties.
Keep sensitive engine evidence and deployment configuration in private systems.
