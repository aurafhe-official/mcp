# Owner and compute setup

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

Requires Node 20+, Python 3, Linux x86-64 and the separately supplied Keyxx shared library with the hash in `native/keyxx_runtime.py`. Windows DLL compatibility has not been verified. No cryptographic core source or binary is distributed here.

## 1. Generate synthetic keys on the owner device

Run from the repository root. Use absolute paths; do not run key generation and key loading in the same process. Generation creates about 243 MB of evaluation data in the tested profile.

```sh
python3 native/keyxx_runtime.py keygen --diagnostic \
  --library /absolute/path/keyxx.sdk.so \
  --owner-dir /absolute/path/owner-keys \
  --public-dir /absolute/path/public-keys
```

Record the printed `keyId`. Keep `owner-keys/skb` private. Give the compute process only `public-keys/pkb` and `public-keys/dictb`. These parameter values reproduce the synthetic compatibility test; they are not an audited security level. The adapter suppresses native diagnostics because they can contain key material.

## 2. Start separate runtimes

Set a different random `AFHE_RUNTIME_TOKEN` (at least 32 characters) in each process's environment. Do not put the owner token in the MCP environment. Start these in separate terminals on the appropriate machines:

```sh
# Owner terminal, on the data owner's device:
python3 native/keyxx_runtime.py serve --diagnostic --role owner \
  --library /absolute/path/keyxx.sdk.so --public-dir /absolute/path/public-keys \
  --secret-key /absolute/path/owner-keys/skb --port 8081

# Worker terminal, without access to owner files or credentials:
python3 native/keyxx_runtime.py serve --diagnostic --role compute \
  --library /absolute/path/keyxx.sdk.so --public-dir /absolute/path/public-keys \
  --port 8082
```

By default both listen on `127.0.0.1`. A worker on a different machine needs `--host`, `--cert`, and `--tls-key` with a trusted certificate; use its HTTPS URL. Owner listeners are loopback only. Worker routes are `/health`, `/functions`, and an arithmetic-only `/call`; there is no `/load`, `/decrypt`, key generation, or arbitrary native dispatch route. A keyless adapter does not repair the underlying engine's confidentiality defect.

## 3. Prepare owner inputs outside the model

In the owner's terminal set `AFHE_OWNER_URL=http://127.0.0.1:8081`, `AFHE_OWNER_API_KEY` to the owner token, `AFHE_COMPUTE_URL` to the worker origin, and `AFHE_KEY_ID` to the generated key ID. Create `owner-inputs.json` with synthetic values:

```json
{"domain":"int","values":[25,17]}
```

```sh
node dist/owner-cli.js prepare owner-inputs.json encrypted-inputs.json
```

Transfer only `encrypted-inputs.json` to the MCP host. Do not attach the plaintext file, key file or owner credentials to the model. Give the MCP process only the variables in the root README. A shell-enabled agent must not share the owner's file permissions or environment. Start one stdio MCP process for each owner session.

## 4. Compute and reveal locally

Ask the agent to list `fhe_inputs`, add the two handles with `fhe_compute`, then call `fhe_export_result`. The output directory receives `ct_<random>.json`; the tool returns an identifier, not plaintext. Transfer that encrypted result back to the owner device and run:

```sh
node dist/owner-cli.js decrypt /absolute/path/ct_RESULT.json
```

The owner terminal displays `42`. Do not run owner decryption as a model tool. Two-party sums can reveal another party's input when one input and the sum are known; this example establishes no multi-party privacy guarantee.

## Reproduce the functional integration check

```sh
npm test
AFHE_NATIVE_LIBRARY=/absolute/path/keyxx.sdk.so npm run test:native
```

The native test generates temporary synthetic keys, launches distinct owner and worker processes with separate tokens, drives the actual MCP tools, checks numeric answers, and rejects unauthenticated or forbidden worker routes. Native failures fail the command. The final report still says `confidentialityRelease: blocked`.

`AURA_LIVE_TESTS=1 npm test` enables legacy backend tests; those require a separately configured trusted synthetic backend. They are not the role-separated native test. GitHub installation testing is separately opt-in with `AURA_MCP_GITHUB=1`.
