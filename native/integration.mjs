import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { ownerClient } from '../dist/owner.js';

const env=process.env;
const token=env.TEST_COMPUTE_TOKEN;
const owner=ownerClient(env.TEST_OWNER_URL,env.TEST_COMPUTE_URL,env.TEST_KEY_ID,env.TEST_OWNER_TOKEN);
const json=(result)=>{
  const data=JSON.parse(result.content.find(x=>x.type==='text').text);
  if(result.isError)throw Error(data.error);
  return data;
};
const observations=[];
async function workflow(domain,values,operations) {
  const bundle=await owner.prepare(domain,values);
  const input=join(env.TEST_DIR,domain+'-inputs.json');
  await writeFile(input,JSON.stringify(bundle));
  const transport=new StdioClientTransport({command:process.execPath,args:['dist/index.js'],cwd:process.cwd(),stderr:'pipe',env:{
    PATH:env.PATH,
    AFHE_INPUT_BUNDLE:input,
    AFHE_COMPUTE_URL:env.TEST_COMPUTE_URL,
    AFHE_COMPUTE_API_KEY:token,
    AFHE_KEY_ID:env.TEST_KEY_ID,
    AFHE_RESULT_DIR:env.TEST_DIR,
  }});
  const client=new Client({name:'native-integration',version:'1'});
  await client.connect(transport);
  try {
    const tools=(await client.listTools()).tools.map(x=>x.name);
    assert.ok(!tools.includes('fhe_decrypt'));assert.ok(!tools.includes('fhe_encrypt'));
    const handles=json(await client.callTool({name:'fhe_inputs',arguments:{}})).inputs.map(x=>x.handle);
    let last;
    for(const {op,indices,expected,tolerance=0} of operations) {
      const inputs=indices.map(i=>i==='last'?last:handles[i]);
      const result=json(await client.callTool({name:'fhe_compute',arguments:{op,inputs}}));
      assert.ok(!('plaintext' in result));last=result.handle;
      const exported=json(await client.callTool({name:'fhe_export_result',arguments:{handle:last}}));
      assert.equal(exported.encrypted,true);
      const payload=JSON.parse(await readFile(join(env.TEST_DIR,exported.resultId+'.json'),'utf8'));
      const plaintext=await owner.decrypt(payload);
      const error=Math.abs(Number(plaintext)-expected);
      assert.ok(error<=tolerance,`${domain} ${op}: expected ${expected}, observed ${plaintext}`);
      observations.push({domain,operation:op,expected,observed:Number(plaintext),tolerance});
    }
  } finally {await client.close()}
}
await workflow('int',[25,17,6,7,84],[
  {op:'add',indices:[0,1],expected:42},
  {op:'mul',indices:[2,3],expected:42},
  {op:'sub',indices:[0,1],expected:8},
  {op:'div',indices:[4,3],expected:12},
]);
await workflow('float',[81,94,73,3],[
  {op:'add',indices:[0,1,2],expected:248,tolerance:0.25},
  {op:'div',indices:['last',3],expected:248/3,tolerance:0.1},
  {op:'mul',indices:[0,3],expected:243,tolerance:0.25},
  {op:'sub',indices:[1,2],expected:21,tolerance:0.025},
]);
for(const [path,body,expected] of [
  ['/decrypt/int',{ciphertext:'synthetic-invalid-ciphertext'},404],
  ['/load',{skb:'file/skb'},404],
  ['/call',{fn:'DecryptInt',args:['synthetic-invalid-ciphertext']},400],
]) {
  const r=await fetch(env.TEST_COMPUTE_URL+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(r.status,expected);
}
assert.equal((await fetch(env.TEST_COMPUTE_URL+'/health')).status,401);
console.log(JSON.stringify({functionalIntegration:'passed',engine:'supplied Keyxx shared library',mockCryptography:false,operations:observations,roleRoutes:'passed',confidentialityRelease:'blocked; separate native-engine finding remains'},null,2));
