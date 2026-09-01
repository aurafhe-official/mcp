# 05 — CLI demo

No code. Just shell.

```bash
npm install -g @aura/fhe-cli
fhe connect --url https://localhost:8443
bash demo.sh
```

Expected:

```
>> health
{"status":"ok"}
>> encrypt two binary values
>> homomorphic XOR
>> decrypt
25 XOR 10 = 19
>> negation via stdin pipe
...
```
