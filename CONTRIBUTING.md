# Contributing

Use Node 20+. Run `npm ci --ignore-scripts`, `npm test`, `npm run test:package`
and `git diff --exit-code -- dist` after rebuilding. Compiled output is committed
for pinned GitHub installation.

This repository is the public client boundary. Do not add engine bindings,
algorithms, key generation, proprietary parameters, native binaries, private
deployment details, private test evidence or server diagnostics. Add only public
tool/transport contracts and synthetic contract tests. All evaluation is performed
by the private service; do not add a local fallback or a bypass for TLS/auth checks.

Live backend changes and end-to-end FHE verification belong in the private service
workflow. Coordinate the public contract with that service before deployment.
