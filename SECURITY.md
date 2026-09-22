# Security policy

Report privately to security@afhe.io; do not publish vulnerability details in issues.

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

The default MCP has no plaintext-input, encryption, decryption or arbitrary-file tools. It imports an owner-prepared ciphertext bundle, sends arithmetic to a separate worker, and exports encrypted results. The owner CLI is a separate trusted application and must never be exposed as an agent tool. `--trusted-demo` retains the former trusted-backend mode and is unsuitable for confidential data.

The native engine's confidentiality release gate is blocked. Restricting the adapter's routes is not a proof that an operator holding the native binary and evaluation material cannot recover inputs. Engine repair and independent review are required before privacy claims or real-data deployment.

Before production: validate the scheme and parameters, review evaluation-key leakage, isolate owner storage and credentials, authenticate inputs/results and ownership, implement computation authorization and resource limits, validate circuit depth and arithmetic ranges, and test key rotation and deletion. The result key tag is not cryptographic authentication or a correctness proof. No production sign-off is given by this repository's tests.
