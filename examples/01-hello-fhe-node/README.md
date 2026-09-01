# 01 — Hello FHE (Node)

Encrypt → compute → decrypt in JavaScript.

```bash
npm install
node index.js
```

Expected output:

```
health: { status: 'ok' }
2 + 1 = 3
2.5 + 1.5 = 4
25 XOR 10 = 19
CMux(1, 0xFF, 0x00) = 255
```

If you see `network error` or `cannot reach coprocessor`, start a local server
or point `AFHE_API_URL` at genesis: `https://api.afhe.io:8443`.
