# Native compatibility adapter

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

See [setup and test commands](../docs/QUICKSTART.md). This Python standard-library adapter binds the supplied Go C ABI (`GoString` by value, `Init` returning void, returned pointers freed with `freePoint`). The library is process-global and calls are serialized. Key generation and loading use different processes.

Accepted Linux x86-64 build SHA-256:

`fbb26df9df8ec58e150c21eb3acc0c646c02d0b4ac408e39930681aa2938f28a`

The archive is named v5 / 20260429, but this binary reports `Keyxx V0.4.2.20260420`. File hash is the compatibility identity. It does not certify origin or security. Unknown builds fail closed pending compatibility and security review.

The adapter deliberately provides only numeric encryption/decryption in the local owner role and eight binary arithmetic functions in the compute role. Other native API exports are not exposed. The worker must run without access to secret-key files; do not treat process separation alone as OS isolation. Use separate machines, users or restricted mounts.

The synthetic test profile is m=2, n=4, q=2147483647, p=512, delta=0.0001. It is not a production parameter recommendation. Float operations are approximate; malformed input, division by zero, unsupported domains and excessive circuit depth may terminate the native process. This is a diagnostic adapter, not a hardened hosted service.
