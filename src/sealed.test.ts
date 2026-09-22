import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { SealedSession, InputBundle, computeClient, endpoint, type ComputeClient } from './sealed.ts'
import { createSealedServer } from './sealed-server.ts'
import { ownerClient } from './owner.ts'

function fixture() {
  const calls: Array<{fn:string;args:string[]}> = []
  const worker:ComputeClient={health:async()=>({status:'ok'}),functions:async()=>({arity1:[],arity2:['AddCipherInt','AddCipherFloat'],arity3:[]}),call:async(fn,args)=>{calls.push({fn,args});return 'synthetic-ct-result'}}
  const bundle:InputBundle={version:1,keyId:'test-key',inputs:[{domain:'int',ciphertext:'synthetic-ct-a'},{domain:'int',ciphertext:'synthetic-ct-b'}]}
  const session=new SealedSession(worker,bundle)
  return {worker,bundle,session,calls}
}
test('computation sends only ciphertext and returns only a random handle',async()=>{
  const m=fixture(), handles=m.session.inputs().map(x=>x.handle)
  const result=await m.session.compute('add',handles)
  assert.match(result.handle,/^ct_[a-f0-9]{32}$/)
  assert.deepEqual(m.calls,[{fn:'AddCipherInt',args:['synthetic-ct-a','synthetic-ct-b']}])
  assert.ok(!('plaintext' in result)); assert.ok(!('ciphertext' in result))
  assert.equal(m.session.exportResult(result.handle).keyId,'test-key')
})
test('handles from another owner session cannot be used',async()=>{
  const a=fixture(),b=fixture()
  await assert.rejects(b.session.compute('add',a.session.inputs().map(x=>x.handle)),/Unknown handle/)
  assert.equal(b.calls.length,0)
})
test('mixed domains and plaintext strings are rejected before computation',async()=>{
  const m=fixture();m.bundle.inputs[1].domain='float'
  const session=new SealedSession(m.worker,m.bundle)
  await assert.rejects(session.compute('add',session.inputs().map(x=>x.handle)),/same domain/)
  await assert.rejects(m.session.compute('add',['25','17']),/Unknown handle/)
  assert.equal(m.calls.length,0)
})
test('bad arity and arbitrary raw function names are rejected',async()=>{
  const m=fixture(),h=m.session.inputs().map(x=>x.handle)
  await assert.rejects(m.session.compute('add',[h[0]]),/number/)
  await assert.rejects(m.session.compute('sub',[...h,h[0]]),/number/)
  await assert.rejects(m.session.compute('DecryptInt' as never,h),/Unsupported/)
})
test('unadvertised backend functions fail closed',async()=>{
  const m=fixture()
  await assert.rejects(m.session.compute('mul',m.session.inputs().map(x=>x.handle)),/not advertised/)
  assert.equal(m.calls.length,0)
})
test('handles expire and input ciphertext cannot be exported as a computed result',()=>{
  const m=fixture();let now=0
  const s=new SealedSession(m.worker,m.bundle,()=>now),h=s.inputs()[0].handle
  assert.throws(()=>s.exportResult(h),/Only computed/)
  now=3600000;assert.throws(()=>s.exportResult(h),/expired/)
})
test('bundle schema rejects unexpected fields and secret-key fields',()=>{
  const m=fixture()
  assert.throws(()=>InputBundle.parse({...m.bundle,skb:'secret'}))
  assert.throws(()=>InputBundle.parse({...m.bundle,inputs:[{domain:'int',ciphertext:'ct',plaintext:'25'}]}))
})
test('compute transport does not expose encrypt/decrypt/load and refuses raw dispatch',async()=>{
  const seen:unknown[]=[]
  const c=computeClient('https://worker.example',undefined,async(url,init)=>{seen.push([String(url),JSON.parse(String(init?.body)),init?.redirect]);return Response.json({result:'ct-result'})})
  assert.equal(await c.call('AddCipherInt',['ct-a','ct-b']),'ct-result')
  await assert.rejects(c.call('DecryptInt',['ct-a','ct-b']),/Unsupported/)
  assert.deepEqual(seen,[['https://worker.example/call',{fn:'AddCipherInt',args:['ct-a','ct-b']},'error']])
  for(const k of ['encrypt','decrypt','load','connect'])assert.ok(!(k in c))
})
test('remote plaintext HTTP, credential URLs, and remote owner runtimes are refused',()=>{
  for(const url of ['http://worker.example','https://user:pass@worker.example','https://worker.example/?x=1'])assert.throws(()=>endpoint(url))
  assert.throws(()=>ownerClient('https://remote.example','https://worker.example','key'))
  assert.throws(()=>ownerClient('http://127.0.0.1:8000','http://127.0.0.1:8000','key'))
})
test('owner encryption and decryption only address the local owner runtime',async()=>{
  const calls:Array<{url:string;body:unknown}>=[]
  const owner=ownerClient('http://127.0.0.1:8000','https://worker.example','key',undefined,async(url,init)=>{
    calls.push({url:String(url),body:init?.body ? JSON.parse(String(init.body)) : undefined})
    if (String(url).endsWith('/health')) return Response.json({status:'ok',role:'owner',secretKeyLoaded:true,keyId:'key'})
    return Response.json(String(url).includes('/encrypt/')?{ciphertext:'ct-local'}:{plaintext:'42'})
  })
  const bundle=await owner.prepare('int',[25,17]);assert.equal(bundle.inputs.length,2)
  const result={version:1 as const,keyId:'key',resultId:'ct_'+'a'.repeat(32),domain:'int' as const,ciphertext:'ct-result',operation:'add' as const}
  assert.equal(await owner.decrypt(result),'42')
  assert.ok(calls.every(x=>x.url.startsWith('http://127.0.0.1:8000/')))
  await assert.rejects(owner.decrypt({...result,keyId:'another-key'}),/different key/)
  assert.equal(calls.length,5)
})
test('owner rejects unsafe integer numbers and malformed values before sending plaintext',async()=>{
  let calls=0
  const owner=ownerClient('http://127.0.0.1:8000','https://worker.example','key',undefined,async()=>{calls++;return Response.json({ciphertext:'ct'})})
  await assert.rejects(owner.prepare('int',[Number.MAX_SAFE_INTEGER+1]))
  await assert.rejects(owner.prepare('int',['bad']))
  assert.equal(calls,0)
})
test('MCP accepts handles only, exports encrypted results, and exposes no decryption tool',async()=>{
  const m=fixture(),saved:unknown[]=[]
  const server=createSealedServer(m.session,async result=>{saved.push(result)})
  const client=new Client({name:'test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair()
  await server.connect(b);await client.connect(a)
  const parse=(r:any)=>JSON.parse(r.content[0].text)
  try {
    assert.deepEqual((await client.listTools()).tools.map(x=>x.name).sort(),['fhe_compute','fhe_export_result','fhe_inputs','fhe_ops','fhe_status'])
    const inputs=parse(await client.callTool({name:'fhe_inputs',arguments:{}})).inputs.map((x:any)=>x.handle)
    const bad=await client.callTool({name:'fhe_compute',arguments:{op:'add',inputs,reveal:true}})
    assert.equal(bad.isError,true)
    const result=parse(await client.callTool({name:'fhe_compute',arguments:{op:'add',inputs}}))
    const exported=parse(await client.callTool({name:'fhe_export_result',arguments:{handle:result.handle}}))
    assert.equal(exported.encrypted,true);assert.equal(saved.length,1)
    assert.ok(!JSON.stringify(exported).includes('ct-result'))
  } finally {await client.close();await server.close()}
})


test('worker health rejects a secret-key server even when reachable',async()=>{
  const worker=computeClient('https://worker.example',undefined,async()=>Response.json({status:'ok',role:'owner',secretKeyLoaded:true,keyId:'key'}))
  await assert.rejects(worker.health(),/compute-only/)
})
test('owner key mismatch prevents plaintext submission',async()=>{
  const paths:string[]=[]
  const owner=ownerClient('http://127.0.0.1:8000','https://worker.example','key',undefined,async(url)=>{
    paths.push(String(url)); return Response.json({status:'ok',role:'owner',secretKeyLoaded:true,keyId:'wrong'})
  })
  await assert.rejects(owner.prepare('int',[25]),/key identifier/)
  assert.deepEqual(paths,['http://127.0.0.1:8000/health'])
})
