# Basic Operations Example

Demonstrates encrypt, compute, and decrypt using the AfheClient.

## What it does

1. Connects to the Aura FHE service
2. Generates keys (first run only)
3. Runs integer arithmetic, float scientific, string, and bitwise operations
4. Signs and verifies a message

## Run

```bash
# Start the Aura FHE service first, then:
npm install
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx examples/basic-operations/index.ts
```

## Expected Output

```
health: { status: 'ok' }
keygen: { skipped: true, ... }
load: { loaded: [ 'skb', 'pkb', 'dictb' ] }
17 + 25 = 42
17 * 25 = 425
sqrt(9) = 3
concat = hello world
25 XOR 10 = 19
verify = true
```
