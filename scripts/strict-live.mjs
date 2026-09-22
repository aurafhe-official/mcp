// Synthetic functional smoke test only. Passing does not certify FHE security.
// The backend must already have an isolated test key provisioned by its operator.
import assert from 'node:assert/strict';
import { FheSession, createHttpCoprocessor, DEFAULT_COPROCESSOR_URL } from '../dist/fhe.js';
const fhe=createHttpCoprocessor({
  baseUrl:process.env.AFHE_API_URL ?? DEFAULT_COPROCESSOR_URL,
  apiKey:process.env.AFHE_API_KEY,
  insecureTLS:false,
  autoLoad:false,
  timeoutMs:10000,
});
await fhe.connect();
const fns=await fhe.functions();
const offered=new Set([...fns.arity1,...fns.arity2,...fns.arity3]);
for (const name of ['AddCipherInt','AddCipherFloat','DivideCipherFloat']) assert.ok(offered.has(name),'missing '+name);
const session=new FheSession(fhe);
const add=await session.privateEval({domain:'int',op:'add',values:[25,17],reveal:true});
assert.equal(add.plaintext,'42');
const mean=await session.privateEval({domain:'int',op:'mean',values:[81,94,73],reveal:true});
assert.ok(Math.abs(Number(mean.plaintext)-248/3)<0.01,'incorrect mean: '+mean.plaintext);
const a=await session.encrypt('float',10), b=await session.encrypt('float',21);
const result=await session.compute({domain:'float',op:'mean',inputs:[a.handle,b.handle]});
assert.equal(result.plaintext,undefined);
assert.ok(Math.abs(Number((await session.decrypt(result.handle)).plaintext)-15.5)<0.01);
console.log('PASS: verified TLS, backend health, function presence, sum, one-shot mean, and float-handle mean. Cryptographic privacy still requires separate verification.');
