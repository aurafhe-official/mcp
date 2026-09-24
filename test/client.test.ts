import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { HttpsCoprocessor, type Coprocessor } from '../src/coprocessor.ts'
import { FheSession } from '../src/fhe.ts'
import { createFheServer } from '../src/server.ts'
import { readBundle, resultWriter } from '../src/artifacts.ts'
import { FUNCTIONS, MAX_RESPONSE, type ResultBundle } from '../src/contracts.ts'

const endpoint = 'https://coprocessor.example.invalid'
const bundle = { version: 1 as const, keyId: 'test-key', inputs: [
  { domain: 'int' as const, ciphertext: 'cipher-a' }, { domain: 'int' as const, ciphertext: 'cipher-b' },
  { domain: 'float' as const, ciphertext: 'cipher-c' }] }
function fixture() {
  let now = Date.now()
  let health: any = { status: 'ok', role: 'compute', secretKeyLoaded: false, keyId: bundle.keyId }
  const calls: any[] = [], results: ResultBundle[] = []
  const remote: Coprocessor = {
    health: async () => health,
    functions: async () => ({ arity1: ['DecryptInt'], arity2: Object.values(FUNCTIONS).flatMap(Object.values), arity3: [] }),
    call: async (fn,args) => { calls.push({fn,args}); return 'cipher-result' },
  }
  const session = new FheSession(remote, { bundle, writeResult: async r => { results.push(r) }, now: () => now })
  return { session, remote, calls, results, setHealth: (value: any) => { health = value }, advance: (n: number) => { now += n } }
}
function transport(reply: (url: URL, init: RequestInit) => Response | Promise<Response>) {
  return new HttpsCoprocessor({ endpoint, token: 'synthetic-test-token', fetch: ((url: any, init: any) => reply(new URL(url),init)) as typeof fetch })
}

test('actual REST contract uses verified HTTPS, bearer auth and strict ciphertext results',async()=>{
  const c=transport((url,init)=>{
    assert.equal(url.pathname,'/call');assert.equal(init.redirect,'error')
    assert.equal((init.headers as any).authorization,'Bearer synthetic-test-token')
    assert.deepEqual(JSON.parse(init.body as string),{fn:'AddCipherInt',args:['cipher-a','cipher-b']})
    return Response.json({result:'cipher-result'})
  })
  assert.equal(await c.call('AddCipherInt',['cipher-a','cipher-b']),'cipher-result')
})
test('transport rejects raw encryption/decryption dispatch before any request',async()=>{
  const c=transport(()=>{assert.fail('must not send')})
  for(const name of ['DecryptInt','EncryptInt','arbitrary']) await assert.rejects(c.call(name,['a','b']),/INVALID_OPERATION/)
})
test('malformed and diagnostic-bearing responses cannot become result handles',async()=>{
  for(const value of [{},{result:''},{result:3},{result:'cipher',secret:'server-internal'}]) {
    await assert.rejects(transport(()=>Response.json(value)).call('AddCipherInt',['a','b']))
  }
})
test('response body errors and credentials are sanitized',async()=>{
  const c=transport(()=>new Response('private server stack and token',{status:500}))
  await assert.rejects(c.health(),e=>String(e)==='Error: COPROCESSOR_UNAVAILABLE')
})
test('insecure endpoints, embedded credentials, paths and TLS bypass are rejected',()=>{
  for(const url of ['http://localhost','https://user:pass@example.test','https://example.test/path','https://example.test?token=x']) assert.throws(()=>new HttpsCoprocessor({endpoint:url}))
  const previous=process.env.NODE_TLS_REJECT_UNAUTHORIZED
  try {process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';assert.throws(()=>new HttpsCoprocessor(),/TLS_VERIFICATION_REQUIRED/)}
  finally {if(previous===undefined)delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;else process.env.NODE_TLS_REJECT_UNAUTHORIZED=previous}
})
test('oversized response streams are bounded',async()=>{
  const c=transport(()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_RESPONSE+1));controller.close()}}),{headers:{'content-type':'application/json'}}))
  await assert.rejects(c.health(),/COPROCESSOR_RESPONSE_LIMIT/)
})
test('aborted requests never reach the network',async()=>{
  const c=transport(()=>{assert.fail('must not send')})
  await assert.rejects(c.health(AbortSignal.abort()),/CANCELLED/)
})
test('timeout cancels an outstanding request and reports a generic error',async()=>{
  const c=new HttpsCoprocessor({timeoutMs:1000,fetch:((_,init)=>new Promise((_,reject)=>init!.signal!.addEventListener('abort',()=>reject(new Error('internal'))))) as typeof fetch})
  await assert.rejects(c.health(),/COPROCESSOR_TIMEOUT/)
})
test('operation discovery filters the live API to supported encrypted arithmetic',async()=>{
  const f=fixture(); f.remote.functions=async()=>({arity1:['DecryptInt'],arity2:['AddCipherInt','Compare'],arity3:['CMux']})
  assert.deepEqual((await f.session.ops()).ops,[{op:'add',domain:'int',minInputs:2,maxInputs:128}])
})
test('inputs -> remote computation -> encrypted artifact; no raw values in tool results',async()=>{
  const f=fixture(), inputs=await f.session.inputs(), handles=inputs.inputs.slice(0,2).map(x=>x.handle)
  const sum=await f.session.compute('add',handles), exported=await f.session.exportResult(sum.handle)
  assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0],{fn:'AddCipherInt',args:['cipher-a','cipher-b']})
  assert.equal(f.results[0].ciphertext,'cipher-result');assert.equal(f.results[0].resultId,exported.resultId)
  assert.ok(!JSON.stringify({inputs,sum,exported}).includes('cipher-'))
  assert.equal(exported.encrypted,true)
})
test('key mismatch and secret-key-loaded workers reject bundle computation',async()=>{
  for(const health of [{status:'ok'}, {status:'ok',role:'compute',secretKeyLoaded:true,keyId:bundle.keyId}, {status:'ok',role:'compute',secretKeyLoaded:false,keyId:'another'}]){
    const f=fixture();f.setHealth(health)
    const handles=(await f.session.inputs()).inputs.slice(0,2).map(x=>x.handle)
    await assert.rejects(f.session.compute('add',handles),/COMPUTE_ONLY_KEY_SCOPE_REQUIRED/)
    assert.equal(f.calls.length,0)
  }
})
test('unknown handles, mixed domains and invalid arity fail without computation',async()=>{
  const f=fixture(), inputs=(await f.session.inputs()).inputs.map(x=>x.handle)
  await assert.rejects(f.session.compute('add',['ct_'+'0'.repeat(32),inputs[0]]),/UNKNOWN_OR_EXPIRED_HANDLE/)
  await assert.rejects(f.session.compute('add',[inputs[0],inputs[2]]),/DOMAIN_MISMATCH/)
  for(const op of ['sub','div'] as const) await assert.rejects(f.session.compute(op,[inputs[0]]),/INVALID_OPERATION/)
  assert.equal(f.calls.length,0)
})
test('handles are isolated per session, expire and stay expired after derivation',async()=>{
  const f=fixture(), other=fixture(), handles=(await f.session.inputs()).inputs.slice(0,2).map(x=>x.handle)
  await assert.rejects(other.session.compute('add',handles),/UNKNOWN_OR_EXPIRED_HANDLE/)
  const sum=await f.session.compute('add',handles)
  f.advance(30*60_000)
  await assert.rejects(f.session.exportResult(sum.handle),/UNKNOWN_OR_EXPIRED_HANDLE/)
  assert.deepEqual((await f.session.inputs()).inputs,[])
})
test('release is atomic and cannot leave stale usable handles',async()=>{
  const f=fixture(), handles=(await f.session.inputs()).inputs.slice(0,2).map(x=>x.handle)
  await assert.rejects(f.session.release([handles[0],'ct_'+'0'.repeat(32)]))
  assert.equal((await f.session.release([handles[0],handles[0]])).released,1)
  await assert.rejects(f.session.compute('add',handles),/UNKNOWN_OR_EXPIRED_HANDLE/)
})
test('inputs cannot be exported as computed results',async()=>{
  const f=fixture();await assert.rejects(f.session.exportResult((await f.session.inputs()).inputs[0].handle),/COMPUTED_RESULT_REQUIRED/)
})
test('busy sessions reject concurrent work; cancellation does not create a handle',async()=>{
  const f=fixture(); const handles=(await f.session.inputs()).inputs.slice(0,2).map(x=>x.handle)
  let finish!:()=>void
  f.remote.call=async()=>{await new Promise<void>(r=>{finish=r});return 'cipher'}
  const controller=new AbortController(), running=f.session.compute('add',handles,controller.signal)
  while(!finish)await new Promise(r=>setImmediate(r))
  await assert.rejects(f.session.inputs(),/BUSY/)
  controller.abort();finish();await assert.rejects(running,/CANCELLED/)
})
test('demo encrypts only the fixed documented values and never loads keys',async()=>{
  const values: string[]=[]
  const c=transport((url,init)=>{assert.match(url.pathname,/^\/encrypt\/(int|float)$/);const b=JSON.parse(init.body as string);assert.equal(b.public,true);values.push(b.value);return Response.json({ciphertext:'cipher-demo'})})
  assert.equal((await c.demoBundle()).inputs.length,5)
  assert.deepEqual(values,['25','17','7.5','2.5','2'])
})
test('bundle and demo cannot be combined',()=>{
  const f=fixture();assert.throws(()=>new FheSession(f.remote,{bundle,demo:async()=>bundle,writeResult:async()=>{}}),/DEMO_AND_BUNDLE_CONFLICT/)
})
test('operator file boundaries reject paths and extra fields; exports never overwrite',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'aura-test-')),input=path.join(dir,'input.json')
  await writeFile(input,JSON.stringify(bundle));assert.deepEqual(await readBundle(input),bundle)
  await assert.rejects(readBundle('relative.json'),/ABSOLUTE_BUNDLE_PATH_REQUIRED/)
  await writeFile(input,JSON.stringify({...bundle,secret:'extra'}));await assert.rejects(readBundle(input))
  const output={version:1 as const,keyId:bundle.keyId,resultId:'ct_'+'a'.repeat(32),domain:'int' as const,ciphertext:'encrypted',operation:'add' as const}
  const write=resultWriter(dir);await write(output);await assert.rejects(write(output))
  assert.deepEqual(JSON.parse(await readFile(path.join(dir,output.resultId+'.json'),'utf8')),output)
})
test('actual MCP validation rejects plaintext, reveal flags and path arguments',async()=>{
  const f=fixture(),server=createFheServer(f.session),client=new Client({name:'test',version:'1'})
  const [a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(a),client.connect(b)])
  try{
    assert.deepEqual((await client.listTools()).tools.map(x=>x.name).sort(),['aura_proof','aura_roadmap','aura_start','fhe_compute','fhe_export','fhe_inputs','fhe_ops','fhe_release','fhe_status'])
    for(const args of [{value:25},{path:'/secret'},{reveal:true}])assert.equal((await client.callTool({name:'fhe_inputs',arguments:args})).isError,true)
    const result=await client.callTool({name:'fhe_inputs',arguments:{}})
    assert.ok(!JSON.stringify(result).includes('cipher-a'))
  }finally{await client.close();await server.close()}
})
test('zero-configuration installed entry performs an actual stdio handshake without backend calls',async()=>{
  const client=new Client({name:'stdio-test',version:'1'})
  const transport=new StdioClientTransport({command:process.execPath,args:['dist/index.js'],env:{...process.env,AURA_COPROCESSOR_URL:'https://127.0.0.1:1'} as Record<string,string>,stderr:'pipe'})
  try{await client.connect(transport);assert.equal((await client.listTools()).tools.length,9)}finally{await client.close()}
})
test('config generator and help need no credentials, and never echo environment secrets',async()=>{
  const run=promisify(execFile)
  for(const host of ['cursor','claude','vscode']){
    const {stdout}=await run(process.execPath,['dist/index.js','--config',host,'--demo'],{env:{...process.env,AURA_ACCESS_TOKEN:'must-not-appear'}})
    const config=JSON.parse(stdout),entry=(config.servers??config.mcpServers).aura
    assert.equal(entry.args.at(-1),'--demo');assert.equal(entry.command,process.execPath);assert.equal(entry.args[0],path.resolve('dist/index.js'));assert.ok(!stdout.includes('must-not-appear'))
  }
  assert.match((await run(process.execPath,['dist/index.js','--help'])).stdout,/synthetic data only/)
  await assert.rejects(run(process.execPath,['dist/index.js','--http']))
})

test('onboarding and evidence never promote worker declarations into Verified mode',async()=>{
  const f=fixture()
  const start=await f.session.start()
  assert.equal(start.mode,'operator-bundle')
  assert.equal(start.confidentialityClaimed,false)
  assert.equal(start.keyCustodyModel,'not-verified')
  assert.equal(start.confidentialityVerified,false)
  assert.equal(start.smokeTest.status,'not-run')
  assert.equal(f.calls.length,0)
  assert.equal(f.session.proof().keyCustody.status,'not-verified')
  assert.equal(f.session.proof().networkJournal.status,'not-implemented')
  assert.equal(f.session.roadmap().verifiedMode.status,'not available in this release')
  assert.equal(f.session.roadmap().nextRelease.status,'planned')
  const demo=new FheSession(f.remote,{demo:async()=>bundle,writeResult:async()=>{}})
  assert.equal(demo.context().mode,'fixed-synthetic-demo')
  assert.equal(demo.context().keyCustodyModel,'backend-keyed')
  assert.equal(demo.proof().keyCustody.status,'not-applicable-to-demo')
  const empty=new FheSession(f.remote,{writeResult:async()=>{}})
  assert.equal(empty.context().mode,'unconfigured')
})

test('tool payloads retain mode and no confidentiality claim on success and operation errors',async()=>{
  const f=fixture(),server=createFheServer(f.session),client=new Client({name:'mode-test',version:'1'})
  const [a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(a),client.connect(b)])
  try {
    for(const name of ['aura_start','aura_roadmap','aura_proof','fhe_status','fhe_ops','fhe_inputs']) {
      const r=await client.callTool({name,arguments:{}})
      const body=JSON.parse((r.content as any)[0].text)
      assert.equal(body.mode,'operator-bundle');assert.equal(body.confidentialityClaimed,false)
      assert.equal(body.keyCustodyModel,'not-verified')
      assert.ok(!JSON.stringify(body).includes('cipher-a'))
    }
    const r=await client.callTool({name:'fhe_compute',arguments:{op:'add',handles:['ct_'+'0'.repeat(32),'ct_'+'1'.repeat(32)]}})
    assert.equal(r.isError,true)
    const body=JSON.parse((r.content as any)[0].text)
    assert.equal(body.mode,'operator-bundle');assert.equal(body.confidentialityClaimed,false)
    assert.equal(body.error,'UNKNOWN_OR_EXPIRED_HANDLE')
  } finally { await client.close();await server.close() }
})

test('computation metrics describe client elapsed time and size without claiming accuracy',async()=>{
  const f=fixture(),handles=(await f.session.inputs()).inputs.slice(0,2).map(x=>x.handle)
  const result=await f.session.compute('add',handles)
  assert.ok(Number.isFinite(result.metrics.clientElapsedMs)&&result.metrics.clientElapsedMs>=0)
  assert.equal(result.metrics.ciphertextBytes,Buffer.byteLength('cipher-result'))
  assert.equal(result.metrics.remoteComputeCalls,1)
  assert.equal(result.metrics.accuracyVerified,false)
  assert.match(result.metrics.timingScope,/not engine-only/)
  assert.ok(!('engineMs' in result.metrics))
})

test('a beginner can follow prompt and returned next actions through a real MCP conversation',async()=>{
  const f=fixture(),session=new FheSession(f.remote,{demo:async()=>bundle,writeResult:async r=>{f.results.push(r)}})
  const server=createFheServer(session),client=new Client({name:'beginner',version:'1'})
  const [a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(a),client.connect(b)])
  const call=async(name:string,args:Record<string,unknown>={})=>{
    const r=await client.callTool({name,arguments:args});assert.ok(!r.isError)
    return JSON.parse((r.content as any)[0].text)
  }
  try {
    assert.ok(client.getInstructions()?.includes('never heard of FHE'))
    assert.ok((await client.listPrompts()).prompts.some(p=>p.name==='aura_demo'))
    const prompt=await client.getPrompt({name:'aura_demo',arguments:{}})
    assert.match((prompt.messages[0].content as any).text,/new to FHE/)
    let response=await call('aura_start')
    assert.equal(response.guide.step,1);assert.equal(f.calls.length,0)
    assert.equal(response.guide.sample.expectedSumIsNotAnObservedResult,true)
    for(const step of [2,3,4]) {
      const action=response.guide.nextAction
      response=await call(action.tool,action.arguments)
      assert.equal(response.guide.step,step)
      assert.ok(!JSON.stringify(response).includes('cipher-a'))
    }
    assert.equal(f.calls.length,1);assert.equal(f.results.length,1)
    assert.equal(response.encrypted,true)
    assert.match(response.guide.whyItMatters,/has not decrypted or verified/)
    assert.equal(response.guide.nextAction,undefined)
  }finally{await client.close();await server.close()}
})

test('beginner guidance handles missing setup, unavailable addition and expired samples honestly',async()=>{
  const f=fixture(),empty=new FheSession(f.remote,{writeResult:async()=>{}})
  assert.match((await empty.start()).guide.nextStep!,/--demo/)
  assert.equal((await f.session.inputs()).guide,undefined)
  const demo=new FheSession(f.remote,{demo:async()=>bundle,writeResult:async()=>{}})
  f.remote.functions=async()=>({arity1:[],arity2:[],arity3:[]})
  assert.equal((await demo.start()).guide.nextAction,undefined)
  const handles=(await demo.inputs()).inputs.map(i=>i.handle)
  await demo.release(handles)
  assert.equal((await demo.inputs()).guide?.nextAction,undefined)
  assert.equal(f.calls.length,0)
})

test('connection failures explain a next step without exposing backend diagnostics',async()=>{
  const f=fixture();f.remote.health=async()=>{throw new Error('private-token-and-stack')}
  const server=createFheServer(f.session),client=new Client({name:'help',version:'1'})
  const [a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(a),client.connect(b)])
  try{
    const response=await client.callTool({name:'aura_start',arguments:{}})
    assert.equal(response.isError,true)
    const text=(response.content as any)[0].text,body=JSON.parse(text)
    assert.ok(body.help.message&&body.help.nextStep)
    assert.ok(!text.includes('private-token-and-stack'))
    assert.equal(body.guide,undefined)
  }finally{await client.close();await server.close()}
})
