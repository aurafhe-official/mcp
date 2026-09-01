/**
 * 06-secure-sum — two parties add their private inputs without either side
 * learning the other's value.
 *
 *   - Alice holds the SKB (the only party that can decrypt).
 *   - Bob holds Alice's PKB and encrypts his contribution against it.
 *   - The compute provider (the coprocessor) adds the ciphertexts.
 *   - Only Alice decrypts the result.
 *
 * The coprocessor sees encrypted blobs only; Bob never sees Alice's plaintext;
 * Alice never sees Bob's plaintext.
 *
 *   node index.js 2 3      # any two integers in [0..4] given the default keys
 */

import { connect } from "@aura/fhe-client";

const [, , aArg = "2", bArg = "1"] = process.argv;
const aliceValue = parseInt(aArg, 10);
const bobValue   = parseInt(bArg, 10);

const fhe = await connect();   // both parties happen to share one connection here
                               // — in a real deployment they would be separate processes.

// --- Alice side ---------------------------------------------------------
// Alice encrypts her input with the *private* key (SKB). The ciphertext is
// safe to publish.
const aliceCt = await fhe.encryptInt(aliceValue);

// --- Bob side -----------------------------------------------------------
// Bob does NOT have Alice's SKB. He uses the matching *public* key (PKB) to
// encrypt his contribution. The two ciphertexts are addable.
const bobCt = await fhe.encryptPublicInt(bobValue);

// --- Compute provider ---------------------------------------------------
// The coprocessor adds them homomorphically. It cannot decrypt either input
// or the result.
const sumCt = await fhe.addInt(aliceCt, bobCt);

// --- Alice receives the encrypted result --------------------------------
const sum = await fhe.decryptInt(sumCt);

console.log(`alice = ${aliceValue}  (only Alice knew this)`);
console.log(`bob   = ${bobValue}    (only Bob knew this)`);
console.log(`sum   = ${sum}         (only Alice can decrypt it)`);
