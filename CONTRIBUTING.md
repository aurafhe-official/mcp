# Contributing

Use Node 20+. Run `npm ci --ignore-scripts`, `npm test`, `npm run test:package`
and `git diff --exit-code -- dist` after rebuilding. Compiled output is committed
for npm and pinned GitHub installation. Also run `npm run test:history` in a full
checkout. After the history cleanup, re-clone rather than merging old history.

This repository is the public client boundary. Do not add engine bindings,
algorithms, key generation, proprietary parameters, native binaries, private
deployment details, private test evidence or server diagnostics. Add only public
tool/transport contracts and synthetic contract tests. All evaluation is performed
by the private service; do not add a local fallback or a bypass for TLS/auth checks.

The explicit `npm run test:live` check uses only fixed public examples against
the existing API. It must not read owner files, change service key configuration,
publish ciphertext or include native-engine details. Backend changes and private
cryptographic assessment belong in the private service workflow. Preserve the
confidentiality release gate until those prerequisites have been cleared.
