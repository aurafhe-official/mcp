# AI and encrypted computation

**Diagnostic preview — synthetic data only. The supplied native engine has not passed the confidentiality release gate. Working arithmetic is not evidence that the compute provider cannot recover inputs.**

The useful implemented workflow is agent orchestration over handles: an owner encrypts outside the model, an agent selects numeric arithmetic, a worker returns ciphertext, and the owner decrypts outside the model. The agent sees tool names, domains, input counts and operation structure. This does not hide metadata, prove result correctness, or certify the cryptographic engine.

Do not claim “the compute provider cannot recover inputs” for the supplied engine. Do not claim that entering plaintext in a chat becomes private after encryption. See [the complete workflow](QUICKSTART.md).
