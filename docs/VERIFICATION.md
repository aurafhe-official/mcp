# Verification

Checked 24 September 2026. These are functional and adapter checks, not a
cryptographic audit or production release.

| Check | Observed result |
| --- | --- |
| Hosted HTTPS certificate | Verified for api.afhe.io; expires 27 October 2026 |
| Health and function discovery | Successful over verified HTTPS |
| Local regression suite | 29 tests passed, zero skipped |
| Actual stdio MCP -> hosted compute -> encrypted file -> external verification | 13 fixed synthetic arithmetic checks passed |
| Service key configuration | No load, key generation or initialization requested |
| Confidentiality release gate | Still blocked |

Live cases: integer add/subtract/multiply/divide; float
add/subtract/multiply/divide; an encrypted float average composed from sum/division;
an integer multiply using a previous encrypted sum; and a weighted sum composed
from two encrypted products. Expected results included
42, 8, 425, 1, 10, 5, 18.75, 3, 5 and 714 for the original ten cases; weighted products and sum expect 15, 5 and 20. Float tolerance: 0.01.
This is bounded sample coverage, not proof for arbitrary values or circuit depth.

The live verifier prepares only fixed public inputs. MCP returns handles and
encrypted result IDs; the verifier reads those artifacts and requests decryption
outside MCP. The hosted API can decrypt its demo data, so this check does not
establish owner-only key custody.

`npm test` checks protocol behavior, transport limits, cancellation, invalid
inputs, isolation, expiry, file bounds, host configuration and the stdio handshake.
`npm run test:package` installs the packed artifact and checks its public inventory.
`npm run test:live` explicitly performs the live check; failures are not skipped.
CI runs offline/package checks on Windows and Ubuntu with Node 20, 22 and 24.

Independent engine confidentiality review, production key isolation and multi-tenant
authorization remain outside these results. No production sign-off is implied.

The rc.6 verifier also checks the beginner prompt, four guide stages, executable
next actions, onboarding and evidence labels. A conversation test follows the
returned actions through a real MCP session; failure and missing-setup tests
ensure no invented completion. The host's natural-language presentation varies
by app and model; these checks verify the instructions and protocol flow.
Computation output
includes client elapsed time and ciphertext size; the verifier reports actual
absolute error. These are sample measurements, not an engine-only benchmark.
