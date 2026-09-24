# Handover: Verified-mode build, answers to PR #3

**Location.** This archive. Source under `src/`, tests under `scripts/e2e.mjs`, reference coprocessor under `src/reference/`.

**Deployed test endpoint.** None. The build runs end to end against the bundled reference coprocessor on localhost. It has never run against `api.afhe.io:8443` because that backend does not implement `/params`, `/session` or `/eval`, and it exposes `/encrypt` and `/decrypt`, which Verified mode forbids. Standing up the production endpoint on this contract is the backend team's task; `docs/PROTOCOL.md` is the spec.

**What is measured here (this machine, reference engine, N=8192 CKKS):** 7/7 proof checks; add error ~1e-11, mul error ~1e-2 absolute on values ~1e5 (relative ~1e-7); 51-step chain error 2.6e-5; engine time 9-70 ms per op; ciphertext ~215 KB (fresh, seeded symmetric) to ~440 KB (after compute); public relin key ~930 KB uploaded once per session.

**Position relative to PR #3.** PR #3 is right not to claim Verified mode, /session, comparison/max, a traffic journal or local keygen, because main does not have them. This build has all of those except comparison/max, which stay declared-but-disabled until the engine advertises them. Recommended sequence:
1. Merge PR #3 as the Demo-mode release (rc.5). It is the honest public surface today.
2. Land this build on a `verified` branch. Do not publish it as a mode of the npm package until the production endpoint implements the contract and the proof suite passes against it.
3. Backend: implement `aura-coprocessor/1`, remove user-session decrypt paths, move to 443.
4. Client: implement `src/crypto/provider.ts` with the Aura client library (CLI now, WASM later). The reference SEAL implementation remains as the conformance harness in CI.
5. When steps 3 and 4 pass `npm test` and `node dist/index.js proof` against `api.afhe.io`, add Verified mode to the README, `aura_start` and `aura_proof` in the main package.

**Completed-application claims (FHE database, FHE-AI inference).** These came from the founder, not from this build. They belong in `aura_roadmap` and the README only once the team confirms them; this build does not reference them.

**Do not do.** Do not run investor demos on the reference engine and describe the result as Aura's engine. Do not enable Demo-mode keys inside Verified mode. Do not add `/decrypt` back to satisfy a demo.
