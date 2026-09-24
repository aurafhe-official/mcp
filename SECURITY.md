# Security — unpublished engineering reference

Use synthetic data only. This branch is not approved for confidential production
data and is not part of the public npm release. The server is a localhost
Microsoft SEAL evaluator; it is not Aura's proprietary engine.

Local encryption and functional tests do not establish deployment confidentiality.
Computed results can be revealed into the agent conversation. The journal and
seven checks have the limitations documented in [REVIEW.md](docs/REVIEW.md).
Key isolation, Windows ACLs, authorization, transport bounds, persistence and
independent security review remain open. Do not treat a passing test as sign-off.

Report issues privately to security@afhe.io. Do not include keys or confidential
inputs in public reports. Never publish this branch as the main npm package.
