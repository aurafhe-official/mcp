# AURA MCP — unpublished reference branch

**Engineering only. Microsoft SEAL reference implementation; not Aura's engine.**
This branch explores the client/server integration proposed in
[HANDOVER.md](docs/HANDOVER.md). It is excluded from the main npm package and
`private: true` prevents publication. For the public Aura demo, use
[main](https://github.com/aurafhe-official/mcp).

Read [the import review and open issues](docs/REVIEW.md) before using this code.
There is no deployed Aura test endpoint for this contract. No production
confidentiality or investor benchmark claim follows from the reference tests.

## Run the reference checks

Use Node.js 24+ and synthetic data only:

```sh
npm ci --ignore-scripts
npm test
```

The tests start a localhost Microsoft SEAL CKKS coprocessor, encrypt examples
locally, compute and decrypt locally. They cover a payroll mean, weighted score,
seven sampled observations and failure classification. Passing those observations
is not a cryptographic security certification.

For separate local terminals, build and run `npm run reference`, then use
`node dist/index.js status` or `node dist/index.js proof`. The default endpoint is
`http://127.0.0.1:8787`. `node dist/index.js config cursor` (also claude, codex or
vscode) prints settings pointing at this compiled checkout, under aura_reference.
It does not install or run the main-branch package. Do not use confidential data.

## What is here

- Local key generation and ciphertext vault using Microsoft SEAL CKKS.
- MCP tools for sealing synthetic values/CSV, computing, revealing local results,
  inspecting sampled checks and request metadata, and forgetting handles.
- A localhost reference evaluator for the proposed
  [aura-coprocessor/1 contract](docs/PROTOCOL.md).
- A provider interface for future Aura integration; the Aura provider is absent.

Reference operations: add, sub, mul, sum, scale and weighted_sum. Mean composes
sum and scale. Comparison, max and division remain unavailable on this engine.

The backend team must implement the compute-only production contract, and the
client must integrate Aura cryptography and parameters. Resolve the review issues
and validate the same reviewed test suite against that deployment before any
Verified mode is considered for main. Until then, investor demos use main's
backend-keyed Aura Demo mode, not this reference engine.

MIT. Mochi Labs. gen@afhe.io
