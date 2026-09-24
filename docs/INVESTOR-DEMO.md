# Investor walkthrough

## Position the layers

FHE is the encrypted-computation foundation. Aura's coprocessor evaluates
ciphertexts; MCP supplies the agent connection, constrained tools and result
handles. Applications compose those operations into business workflows.

This walkthrough demonstrates the shipped public interface. It is not a
confidentiality certification, a database demo or an inference benchmark.

## Run the public demonstration

1. Install the preview and configure the host with `--demo` using [Quickstart](QUICKSTART.md).
2. Ask for `aura_start`. Show the mode, live operation list and read-this-first notes.
3. Ask for `fhe_inputs`. Inputs 0 and 1 are public integers 25 and 17.
4. Ask for `fhe_compute` with `add` and those handles. Show the encrypted handle,
   measured client latency and ciphertext size. Do not call that engine-only time.
5. Export with `fhe_export`. MCP returns a result ID, not plaintext.
6. Show `aura_proof`: demo key custody is inapplicable; server zero-decryption and
   cryptographic review are not verified. Nothing untested is a pass.
7. Show `aura_roadmap`: primitives, compositions, planned binary operations,
   production separation and the contact for application discussions.

## Show actual numerical correctness

From a source checkout, run `npm ci --ignore-scripts`, then `npm run test:live`.
The verifier starts the actual MCP, computes, exports, and separately decrypts
only its own synthetic results through the demo backend. Wrong answers fail.
The report includes expected/actual values, absolute error, tolerance, request
latency and ciphertext size. Cases include a float mean, an integer chain and a
weighted sum. Those sample checks do not cover every input or circuit depth.

Expected 25 + 17 is 42, but an encrypted handle alone does not prove the answer.
Use the verifier's actual output rather than presenting an expected number as an
observed decrypted result. There is no MCP reveal tool or local-keygen command.

## Technical due diligence: a separate milestone

Before presenting a Verified-mode demonstration, assess the actual local key
generation/encryption/decryption build, deployed compute-only contract,
principal/key isolation, tampering, revocation/rotation and independently reviewed
security assumptions. Inspect actual traffic and server implementation; a worker's
JSON declaration is insufficient.

Wrong-key failure or a ciphertext-only request log alone does not prove
confidentiality. A 50-step circuit, comparison/max, browser WASM, and complete
database/inference applications are outside this walkthrough's verified coverage.
Arrange a separate demonstration with Aura at gen@afhe.io.

## Publication boundary

The public adapter and its tests are open. Private cryptographic implementations,
parameters and deployment evidence remain private unless separately authorized
for release. Proposed future open-source work is not an already completed release.
