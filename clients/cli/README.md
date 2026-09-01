# @aura/fhe-cli

Shell access to the Aura FHE coprocessor.

```bash
npm install -g @aura/fhe-cli
```

```bash
fhe connect --url https://localhost:8443   # local node; or https://api.afhe.io:8443
fhe health                                  # {"status":"ok"}

# Encrypt → add → decrypt
fhe enc int 25 > a.ct
fhe enc int 17 > b.ct
fhe add int "$(cat a.ct)" "$(cat b.ct)" | fhe dec int
# 42
```

`fhe call <fnName> <args>...` reaches every operation the server exposes;
typed shortcuts (`fhe add`, `fhe xor`, `fhe sqrt`, …) cover the common ones.

Stdin is accepted as `-` in any argument position:

```bash
fhe enc binary 12 | fhe call NOTCipher - | fhe dec binary
```

Run `fhe --help` for the full reference.
