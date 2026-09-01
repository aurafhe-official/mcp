# 06 — Secure two-party sum

Alice and Bob each hold a private integer. They want the sum without
revealing their input to the other party or to the compute provider.

```bash
npm install
node index.js 2 3
```

Expected:

```
alice = 2  (only Alice knew this)
bob   = 3  (only Bob knew this)
sum   = 5  (only Alice can decrypt it)
```

### What just happened

1. **Alice** encrypts `2` with her **private key (SKB)** → `aliceCt`.
2. **Bob** encrypts `3` with Alice's **public key (PKB)** → `bobCt`.
   Bob never sees Alice's plaintext; Bob only has the PKB.
3. **The coprocessor** computes `aliceCt + bobCt` homomorphically → `sumCt`.
   The coprocessor sees three opaque ciphertexts and the fact that an
   "add" was requested. It cannot read either input or the result.
4. **Alice** decrypts `sumCt` → `5`. Only Alice has the SKB.

Generalises to N parties: each one encrypts under the same PKB; the
coprocessor reduces with `addInt`; the SKB holder decrypts at the end.

> If you need to regenerate keys for this flow, use the recommended keygen
> profile from `docs/KEY_MANAGEMENT.md`.
