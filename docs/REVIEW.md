# Reference import review — 24 September 2026

This branch is an unpublished engineering reference imported from
`aura-mcp-verified-mode-build.zip`. It is not part of the main npm package.
The original handover records the author's claims; this review records the
subsequent observations and unresolved work. Existing public branding assets are
retained from main; generated output and dependencies are excluded from commits.

## Observed

The supplied source compiled on Node 22.17 but its node-seal 7 WebAssembly failed
to initialize there. The original end-to-end test passed using Node 24.21.0:
payroll mean 9481.251273, weighted score 74.600010, seven checks passed. Those are
Microsoft SEAL reference results, not Aura engine measurements.

The branch requires Node 24, has `private: true` to block npm publication, uses
localhost by default and emits settings for this compiled checkout. Its CI targets
the `verified` branch, not main. The failed-decrypt-route check was corrected:
authentication failures, server errors and network failures are inconclusive,
not evidence of blindness. A regression test covers those cases.

## Unresolved before production

- The seven observations are not security proofs. Health metadata does not prove
  secret-key absence, different ciphertexts do not prove semantic security, and
  a 404 on one route does not rule out other decryption paths.
- The journal records after a response, omits failed requests and headers, keeps
  only 256 request bodies in memory, and tests two key fragments. It is not the
  complete before-send or tamper-evident audit described in the original handover.
- Blocking raw-input reveal is not a data-access policy: a scale-by-one result
  or combinations of queries can disclose an input. Revealed results enter the
  agent conversation. A real deployment needs a defined authorization policy.
- `proof --secret` prints results that can reveal the chosen number. Use only
  public synthetic inputs. File paths and labels can also reach the agent.
- POSIX mode 600 does not establish Windows ACL isolation. Key-file permissions,
  persistence/rotation and concurrent access require platform-specific review.
- Transport response limits, error redaction, CSV parsing, vault consistency,
  resource/session cleanup and multi-user authentication require hardening.
  Forgetting handles currently retains their ciphertext files.
- The reference client is pinned to CKKS parameters. The Aura provider and
  parameter integration are not implemented; changing an endpoint is insufficient.

The production Aura compute-only deployment and independent security assurance
remain outstanding. Comparison/max remain unavailable unless the endpoint
advertises them. No investor demonstration may describe this reference engine
as Aura's engine. Use the backend-keyed Demo release on main for that tour.
