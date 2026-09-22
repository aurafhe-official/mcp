import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FheSession, createHttpCoprocessor, resolveOp, type Coprocessor, type Domain } from './fhe.ts'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { createFheServer } from './server.ts'

function mock() {
  let n = 0
  const calls: string[] = []
  const slots = new Map<string, { domain: Domain; value: string }>()
  const put = (domain: Domain, value: string) => { const ct = 'raw'+(++n); slots.set(ct, { domain, value }); return ct }
  const fhe: Coprocessor = {
    health: async () => ({ status: 'ok' }),
    functions: async () => ({ arity1: [], arity2: [], arity3: [] }),
    encrypt: async (d,v) => { calls.push('encrypt'); return put(d,v) },
    decrypt: async (d,c) => { calls.push('decrypt'); const s = slots.get(c)!; assert.equal(s.domain,d); return s.value },
    call: async (fn,args) => {
      calls.push(fn)
      const a = slots.get(args[0])!, b = slots.get(args[1])!
      if (fn.endsWith('Float')) { assert.equal(a.domain, 'float'); assert.equal(b.domain, 'float') }
      if (fn.startsWith('AddCipher')) return put(a.domain, String(Number(a.value) + Number(b.value)))
      if (fn === 'DivideCipherFloat') return put('float', String(Number(a.value) / Number(b.value)))
      if (fn === 'ConcatString') return put('string', a.value + b.value)
      throw new Error('unexpected operation '+fn)
    },
  }
  return { fhe, calls, session: new FheSession(fhe) }
}
test('invalid binary arity is rejected before sending plaintext', async () => {
  const m = mock()
  await assert.rejects(m.session.privateEval({domain:'int',op:'sub',values:[9]}), /requires 2/)
  assert.equal(m.calls.length,0)
})
test('unary extras and unsupported domains are rejected before backend calls', async () => {
  const m = mock()
  await assert.rejects(m.session.privateEval({domain:'binary',op:'not',values:[0,1]}), /requires 1/)
  await assert.rejects(m.session.privateEval({domain:'int',op:'sqrt',values:[9]}), /unsupported domain/)
  assert.equal(m.calls.length,0)
})
test('unimplemented ternary and plaintext comparison operations fail closed', () => {
  for (const name of ['cmux','CMux','power','PowerCipher','substring','compare','CompareCipherInt','DecryptInt','GenSign']) {
    assert.throws(() => resolveOp(name,'int',3), /unknown op/)
  }
})
test('supported backend aliases remain available', () => {
  assert.equal(resolveOp('AddCipherInt','int',2),'AddCipherInt')
  assert.equal(resolveOp('NOTCipher','binary',1),'NOTCipher')
})
test('integer handles cannot be silently reinterpreted as floats by mean', async () => {
  const m=mock(), a=await m.session.encrypt('int',10), b=await m.session.encrypt('int',20)
  m.calls.length=0
  await assert.rejects(m.session.compute({domain:'int',op:'mean',inputs:[a.handle,b.handle]}), /domain mismatch/)
  assert.equal(m.calls.length,0)
})
test('float handle workflow computes a correct mean', async () => {
  const m=mock(), a=await m.session.encrypt('float',10), b=await m.session.encrypt('float',21)
  const result=await m.session.compute({domain:'float',op:'mean',inputs:[a.handle,b.handle],reveal:true,raw:true})
  assert.equal(result.plaintext,'15.5')
  assert.ok(result.ciphertext)
})
test('plaintext one-shot integer mean is promoted correctly', async () => {
  const result=await mock().session.privateEval({domain:'int',op:'mean',values:[81,94,73],reveal:true})
  assert.ok(Math.abs(Number(result.plaintext)-248/3)<1e-10)
})
test('unknown compute handle is rejected before any backend calls', async () => {
  const m=mock()
  await assert.rejects(m.session.compute({domain:'string',op:'concat',inputs:['suffix','ct_missing']}), /unknown handle/)
  assert.equal(m.calls.length,0)
})
test('mixed ciphertext domains are rejected before backend calls', async () => {
  const m=mock(), a=await m.session.encrypt('string','secret')
  m.calls.length=0
  await assert.rejects(m.session.compute({domain:'int',op:'add',inputs:[2,a.handle]}), /domain mismatch/)
  assert.equal(m.calls.length,0)
})
test('plaintext privateEval strings cannot accidentally resolve to stored handles', async () => {
  const m=mock(), a=await m.session.encrypt('string','synthetic-secret')
  const result=await m.session.privateEval({domain:'string',op:'concat',values:[a.handle,'!'],reveal:true})
  assert.equal(result.plaintext,a.handle+'!')
})
test('malformed backend responses are rejected for encrypt, decrypt and call', async () => {
  const fhe=createHttpCoprocessor({baseUrl:'https://example.test',fetch:async()=>Response.json({})})
  await assert.rejects(fhe.encrypt('int','42'),/expected string ciphertext/)
  await assert.rejects(fhe.decrypt('int','ct'),/expected string plaintext/)
  await assert.rejects(fhe.call('AddCipherInt',['a','b']),/expected string result/)
})
test('one-shot MCP results stay sealed unless reveal is explicitly requested', async () => {
  const m=mock(), server=createFheServer(m.session), client=new Client({name:'audit',version:'1'})
  const [a,b]=InMemoryTransport.createLinkedPair()
  await server.connect(b); await client.connect(a)
  try {
    const result=await client.callTool({name:'fhe_private_eval',arguments:{domain:'int',op:'add',values:[25,17]}})
    const text=result.content.find(x=>x.type==='text') as {text:string}
    assert.equal(JSON.parse(text.text).plaintext,undefined)
    assert.ok(!m.calls.includes('decrypt'))
  } finally { await client.close(); await server.close() }
})
test('advertised mappings cannot be mutated by a caller', () => {
  const m=mock(), ops=m.session.ops()
  ops[0].domains.length=0
  assert.ok(m.session.ops()[0].domains.includes('int'))
  assert.ok(!m.session.ops().some(x=>x.name==='compare'))
})
