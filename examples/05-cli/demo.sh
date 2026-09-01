#!/usr/bin/env bash
# 05-cli — encrypt, compute, decrypt from the shell.
#
# Prerequisite:
#   npm install -g @aura/fhe-cli
#   fhe connect --url https://localhost:8443

set -euo pipefail

echo ">> health"
fhe health

echo ">> encrypt two binary values"
A=$(fhe enc binary 25)
B=$(fhe enc binary 10)

echo ">> homomorphic XOR"
X=$(fhe xor "$A" "$B")

echo ">> decrypt"
PT=$(fhe dec binary "$X")
echo "25 XOR 10 = $PT"

echo ">> negation via stdin pipe"
fhe enc binary 12 | fhe call NOTCipher - | fhe dec binary
