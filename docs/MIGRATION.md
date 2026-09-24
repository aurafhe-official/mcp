# Migration

Use [Quickstart](QUICKSTART.md) to generate new host settings.

- Connecting needs Node and Git, with no cloned-path configuration, Python or
  engine installation. Start with `--check` and `--config`.
- Tools are `fhe_status`, `fhe_ops`, `fhe_inputs`, `fhe_compute`, `fhe_export`
  and `fhe_release`. Computation takes `handles`, not `inputs`.
- Plaintext evaluation/encrypt/decrypt tools and `--trusted-demo` are removed.
  `--demo` permits only five fixed public inputs and encrypted export.
- The earlier proposed session/dataset gateway is replaced by the deployed REST
  API. No new gateway deployment is implied.
- Replace old `AFHE_*` settings and draft gateway key settings with documented
  `AURA_*` configuration. Version 1 numeric bundle/result envelopes remain
  compatible with a separately supplied owner integration.
- Shared HTTP, TLS bypass, automatic key loading and raw dispatch are unsupported.
- Native adapters, owner integration code, engine parameters and build identifiers
  are outside this public package. Removing current files does not erase prior
  GitHub history or downloaded copies.

The confidentiality gate already on main is preserved. This is a synthetic
diagnostic preview, not a production privacy release.
