/**
 * 01-hello-fhe-node — encrypt, compute, decrypt.
 *
 *   npm install
 *   node index.js
 */

import { connect } from "@aura/fhe-client";

const fhe = await connect();                    // localhost:8443; set AFHE_API_URL for genesis

console.log("health:", await fhe.health());

// Integer add (note: default keys cap int at [0,4]; we use 2+1 here)
const a = await fhe.encryptInt(2);
const b = await fhe.encryptInt(1);
console.log("2 + 1 =", await fhe.decryptInt(await fhe.addInt(a, b)));

// Float add (no modulus restriction)
const f1 = await fhe.encryptFloat(2.5);
const f2 = await fhe.encryptFloat(1.5);
console.log("2.5 + 1.5 =", await fhe.decryptFloat(await fhe.addFloat(f1, f2)));

// Binary XOR
const x = await fhe.encryptBinary(25);
const y = await fhe.encryptBinary(10);
console.log("25 XOR 10 =", await fhe.decryptBinary(await fhe.xor(x, y)));

// Encrypted ternary: CMux(1, 1111, 0000) → 1111
const sel = await fhe.encryptBinary(1);
const ifT = await fhe.encryptBinary(0xff);
const ifF = await fhe.encryptBinary(0x00);
console.log("CMux(1, 0xFF, 0x00) =", await fhe.decryptBinary(await fhe.cmux(sel, ifT, ifF)));
