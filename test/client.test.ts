import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { HttpsCoprocessor, type Action, type Coprocessor } from '../src/coprocessor.ts'
import { FheSession } from '../src/fhe.ts'
import { createFheServer } from '../src/server.ts'
import { MAX_RESPONSE, PROTOCOL } from '../src/contracts.ts'

const key = { id: 'key_for_contract_test', version: 1 }
const token = 'service_token_for_tests_only'
const endpoint = 'https://coprocessor.example.invalid/mcp-client'
function transport(reply: (request: any, init: RequestInit) => Response | Promise<Response>) {
  return new HttpsCoprocessor({ endpoint, token, fetch: (async (url, init) => {
    assert.equal(String(url), endpoint)
    assert.equal(init!.redirect, 'error')
    return reply(JSON.parse(init!.body as string), init!)
  }) as typeof fetch })
}
function response(req: any, result: unknown) {
  return Response.json({ protocol: PROTOCOL, requestId: req.requestId, result })
}
function fixture() {
  let now = Date.now()
  const requests: { action: Action; payload: any }[] = []
  const sessions = new Set<string>()
  const remote: Coprocessor = { request: async (action, payload: any) => {
    requests.push({ action, payload })
    if (action === 'session.open') {
      const sessionId = randomUUID(); sessions.add(sessionId)
      return { sessionId, key, expiresAt: now + 3_600_000, capabilities: [
        { op: 'add', domain: 'int', minInputs: 2, maxInputs: 128 },
        { op: 'sub', domain: 'int', minInputs: 2, maxInputs: 2 },
        { op: 'mean', domain: 'float', minInputs: 1, maxInputs: 128 },
      ] }
    }
    assert.ok(sessions.has(payload.sessionId))
    const scope = { sessionId: payload.sessionId, key }
    if (action === 'session.status') return { ...scope, ready: true }
    if (action === 'dataset.import') return { ...scope, objects: [1,2].map(n => ({ objectId: `object_reference_${n}`, domain: 'int', expiresAt: now + 600_000 })) }
    if (action === 'compute') return { ...scope, object: { objectId: 'computed_reference', domain: payload.domain, expiresAt: now + 600_000 } }
    if (action === 'result.export') return { ...scope, resultId: 'encrypted_result_id', expiresAt: payload.expiresAt }
    if (action === 'objects.release') return { ...scope, released: payload.objectIds.length }
    throw new Error('unexpected action')
  } }
  const session = new FheSession(remote, key, () => now)
  return { remote, session, requests, advance: (ms: number) => { now += ms } }
}

test('transport uses HTTPS, credentials, one fixed endpoint and correlation IDs', async () => {
  const remote = transport((req, init) => {
    assert.equal((init.headers as any).authorization, `Bearer ${token}`)
    assert.equal(req.protocol, PROTOCOL)
    assert.equal(req.action, 'compute')
    assert.deepEqual(req.payload, { op: 'add', objectIds: ['reference_a','reference_b'] })
    return response(req, { accepted: true })
  })
  assert.deepEqual(await remote.request('compute', { op: 'add', objectIds: ['reference_a','reference_b'] }), { accepted: true })
})
test('invalid endpoints and credentials are rejected', () => {
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com?token=secret', 'https://example.com#fragment']) {
    assert.throws(() => new HttpsCoprocessor({ endpoint: url, token }), /INVALID_HTTPS_ENDPOINT/)
  }
  assert.throws(() => new HttpsCoprocessor({ endpoint, token: 'x\r\nsecret' }), /INVALID_SERVICE_CREDENTIAL/)
})
test('HTTP errors do not disclose backend bodies or credentials', async () => {
  for (const status of [401,403,429,500]) {
    await assert.rejects(transport(() => new Response('SECRET_INTERNAL_TRACE', { status })).request('session.status', {}), (e: any) => {
      assert.ok(!e.message.includes('SECRET_INTERNAL_TRACE')); assert.ok(!e.message.includes(token)); return true
    })
  }
})
test('wrong correlation, malformed JSON and unexpected envelope fields fail', async () => {
  for (const value of [new Response('not json', { headers: { 'content-type': 'application/json' } }), Response.json({ protocol: PROTOCOL, requestId: 'wrong', result: {} }), Response.json({ result: {}, diagnostics: 'private' })]) {
    await assert.rejects(transport(() => value).request('session.status', {}), /PROTOCOL_FAILED/)
  }
})
test('oversized streaming responses are rejected', async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_RESPONSE + 1)); controller.close() } })
  await assert.rejects(transport(() => new Response(body, { headers: { 'content-type': 'application/json' } })).request('session.status', {}), /RESPONSE_LIMIT/)
})
test('cancellation stops the request without returning server diagnostics', async () => {
  const controller = new AbortController()
  const remote = transport((_, init) => new Promise((_, reject) => { init.signal!.addEventListener('abort', () => reject(new Error('secret')), { once: true }) }))
  const pending = remote.request('session.status', {}, controller.signal)
  controller.abort()
  await assert.rejects(pending, /CANCELLED/)
})
test('timeout terminates the remote request', async () => {
  const remote = new HttpsCoprocessor({ endpoint, token, timeoutMs: 1000, fetch: (async (_, init) => new Promise((_, reject) => { init!.signal!.addEventListener('abort', () => reject(new Error('private')), { once: true }) })) as typeof fetch })
  await assert.rejects(remote.request('session.status', {}), /COPROCESSOR_TIMEOUT/)
})
test('all data work is routed through the coprocessor using opaque references', async () => {
  const f = fixture()
  assert.equal((await f.session.status()).execution, 'aura-coprocessor')
  const imported = await f.session.importDataset('dataset_for_test_1')
  const computed = await f.session.compute('add', imported.handles.map(h => h.handle))
  assert.ok(!JSON.stringify(computed).includes('computed_reference'))
  const exported = await f.session.exportResult(computed.handle)
  assert.equal(exported.resultId, 'encrypted_result_id')
  await f.session.release([computed.handle])
  assert.deepEqual(f.requests.map(r => r.action), ['session.open','session.status','dataset.import','compute','result.export','objects.release'])
  const compute = f.requests.find(r => r.action === 'compute')!.payload
  assert.deepEqual(compute.objectIds, ['object_reference_1','object_reference_2'])
  assert.ok(!Object.hasOwn(compute, 'values'))
})
test('handles cannot be reused by another connection', async () => {
  const f = fixture(), other = new FheSession(f.remote, key)
  const imported = await f.session.importDataset('dataset_for_test_1')
  await assert.rejects(other.compute('add', imported.handles.map(h => h.handle)), /UNKNOWN_OR_EXPIRED/)
  assert.equal(f.requests.filter(r => r.action === 'compute').length, 0)
})
test('invalid arity, integer mean, unknown operations and handles fail before evaluation', async () => {
  const f = fixture(), imported = await f.session.importDataset('dataset_for_test_1')
  const handles = imported.handles.map(h => h.handle)
  for (const [op, refs] of [['sub',[handles[0]]],['mean',handles],['not-an-op',handles],['add',['ct_unknown']]] as const) {
    await assert.rejects(f.session.compute(op as any, [...refs]))
  }
  assert.equal(f.requests.filter(r => r.action === 'compute').length, 0)
})
test('expired handles and sessions fail closed', async () => {
  const f = fixture(), imported = await f.session.importDataset('dataset_for_test_1')
  f.advance(600_001)
  await assert.rejects(f.session.exportResult(imported.handles[0].handle), /UNKNOWN_OR_EXPIRED/)
  f.advance(3_600_000)
  await assert.rejects(f.session.status(), /SESSION_EXPIRED/)
})
test('wrong session/key and unrequested internal fields never reach the model', async () => {
  for (const update of [{ sessionId: 'other_session_identifier' }, { key: { ...key, version: 2 } }, { diagnostics: 'PRIVATE_INTERNAL_DETAIL' }]) {
    const f = fixture(), base = f.remote.request.bind(f.remote)
    f.remote.request = async (...args) => {
      const value = await base(...args)
      return args[0] === 'dataset.import' ? { ...(value as any), ...update } : value
    }
    await assert.rejects(f.session.importDataset('dataset_for_test_1'))
  }
})
test('unsupported or duplicate capability entries are rejected', async () => {
  for (const caps of [[{ op: 'mean', domain: 'int', minInputs: 1, maxInputs: 2 }], [{ op: 'sub', domain: 'int', minInputs: 1, maxInputs: 3 }], [{ op: 'add', domain: 'int', minInputs: 2, maxInputs: 2 },{ op: 'add', domain: 'int', minInputs: 2, maxInputs: 2 }]]) {
    const f = fixture(), base = f.remote.request.bind(f.remote)
    f.remote.request = async (...args) => ({ ...(await base(...args) as any), capabilities: caps })
    await assert.rejects(f.session.ops(), /INVALID_COPROCESSOR_SESSION/)
  }
})
test('MCP exposes only the public client tools and rejects reveal/plaintext fields', async t => {
  const f = fixture(), server = createFheServer(f.session), client = new Client({ name: 'contract-test', version: '1' })
  const [a,b] = InMemoryTransport.createLinkedPair()
  await server.connect(b); await client.connect(a)
  t.after(async () => { await client.close(); await server.close() })
  assert.deepEqual((await client.listTools()).tools.map(t => t.name).sort(), ['fhe_compute','fhe_export','fhe_import','fhe_ops','fhe_release','fhe_status'])
  const bad = await client.callTool({ name: 'fhe_import', arguments: { datasetId: 'dataset_for_test_1', value: 25 } })
  assert.equal(bad.isError, true)
  assert.equal(f.requests.length, 0)
  const good = await client.callTool({ name: 'fhe_import', arguments: { datasetId: 'dataset_for_test_1' } })
  const handles = JSON.parse((good.content as any)[0].text).handles.map((h: any) => h.handle)
  const reveal = await client.callTool({ name: 'fhe_compute', arguments: { op: 'add', handles, reveal: true } })
  assert.equal(reveal.isError, true)
})
test('MCP errors suppress unexpected internal error messages', async t => {
  const f = fixture(); f.remote.request = async () => { throw new Error('PRIVATE_SERVER_TRACE') }
  const server = createFheServer(f.session), client = new Client({ name: 'contract-test', version: '1' })
  const [a,b] = InMemoryTransport.createLinkedPair()
  await server.connect(b); await client.connect(a)
  t.after(async () => { await client.close(); await server.close() })
  const result = await client.callTool({ name: 'fhe_status', arguments: {} })
  assert.equal(result.isError, true)
  assert.ok(!JSON.stringify(result).includes('PRIVATE_SERVER_TRACE'))
})
test('startup requires service configuration and disallows shared HTTP', async () => {
  const exec = promisify(execFile)
  for (const args of [[],['--http']]) {
    await assert.rejects(exec(process.execPath, ['dist/index.js', ...args], { env: {}, timeout: 10_000 }), (e: any) => {
      assert.equal(e.stdout, ''); assert.match(e.stderr, /COPROCESSOR_CONFIGURATION_REQUIRED|STDIO_ONLY/); return true
    })
  }
})
