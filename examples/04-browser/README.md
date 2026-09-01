# 04 — Browser demo

A single-file HTML demo that connects to the coprocessor straight from the
browser. Plaintext values are typed into the page; only ciphertext leaves the
page.

```bash
# 1. Start a local coprocessor on https://localhost:8443
#    (or set the page to https://api.afhe.io:8443 and accept the TLS warning)
# 2. Serve this directory:
npx serve .
# 3. Open http://localhost:3000 in your browser (or whatever port serve picked).
```

Notes:

- The browser cannot accept self-signed certificates without a manual click-through
  in chrome://settings. Either install a real cert on the coprocessor or visit
  `https://localhost:8443/health` first and accept the warning.
- The ESM import resolves to `https://esm.sh/@aura/fhe-client@0.3.0`. To use a
  locally built version, run `npm install && npm run build` inside
  `clients/typescript/` and import from the local `dist/`.
