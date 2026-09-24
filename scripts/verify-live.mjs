// Explicit synthetic integration check; never uses owner files or changes service keys.
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { DEFAULT_ENDPOINT } from '../dist/contracts.js'

const directory = await mkdtemp(path.join(tmpdir(), 'aura-live-'))
const base = new URL(process.env.AURA_COPROCESSOR_URL ?? DEFAULT_ENDPOINT)
assert.equal(base.protocol, 'https:')
assert.ok(!base.username && !base.password && !base.search && !base.hash && base.pathname === '/')
assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0')
const env = Object.fromEntries(Object.entries(process.env).filter(([k,v]) => v !== undefined && !k.startsWith('AURA_') && !k.startsWith('AFHE_')))
env.AURA_COPROCESSOR_URL = base.origin
env.AURA_RESULT_DIR = directory
if (process.env.AURA_ACCESS_TOKEN) env.AURA_ACCESS_TOKEN = process.env.AURA_ACCESS_TOKEN
const command = process.env.AURA_TEST_COMMAND ?? process.execPath
const args = process.env.AURA_TEST_ARGS ? JSON.parse(process.env.AURA_TEST_ARGS) : ['dist/index.js', '--demo']
const client = new Client({ name: 'aura-synthetic-live-verifier', version: '1' })
const transport = new StdioClientTransport({ command, args, env, stderr: 'pipe' })
async function tool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args })
  assert.ok(!result.isError, `${name} failed`)
  const payload = JSON.parse(result.content[0].text)
  assert.equal(payload.mode, 'fixed-synthetic-demo')
  assert.equal(payload.confidentialityClaimed, false)
  return payload
}
const checks = []
try {
  await client.connect(transport)
  assert.deepEqual((await client.listTools()).tools.map(x => x.name).sort(), ['aura_proof','aura_roadmap','aura_start','fhe_compute','fhe_export','fhe_inputs','fhe_ops','fhe_release','fhe_status'])
  assert.equal((await tool('fhe_status')).backendReachable, true)
  assert.equal((await tool('fhe_ops')).ops.length, 8)
  assert.equal((await tool('aura_start')).smokeTest.status, 'not-run')
  assert.equal((await tool('aura_proof')).keyCustody.status, 'not-applicable-to-demo')
  assert.equal((await tool('aura_roadmap')).nextRelease.status, 'planned')
  const { inputs } = await tool('fhe_inputs')
  assert.equal(inputs.length, 5)
  async function verify(op, indexes, domain, expected, supplied) {
    const computed = await tool('fhe_compute', { op, handles: supplied ?? indexes.map(i => inputs[i].handle) })
    const exported = await tool('fhe_export', { handle: computed.handle })
    assert.equal(exported.encrypted, true)
    assert.ok(!('ciphertext' in exported) && !('plaintext' in computed))
    const artifact = JSON.parse(await readFile(path.join(directory, exported.resultId + '.json'), 'utf8'))
    assert.equal(artifact.domain, domain)
    // Decrypt only this script's fixed demo results, outside MCP/model context.
    const response = await fetch(new URL(`/decrypt/${domain}`, base), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { 'content-type': 'application/json', ...(env.AURA_ACCESS_TOKEN ? { authorization: `Bearer ${env.AURA_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify({ ciphertext: artifact.ciphertext }),
    })
    assert.ok(response.ok, 'Synthetic result verification failed')
    const { plaintext } = await response.json()
    assert.ok(typeof plaintext === 'string' || typeof plaintext === 'number')
    const actual = Number(plaintext)
    assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= (domain === 'int' ? 0 : 0.01), `Incorrect ${domain} ${op}`)
    assert.ok(Number.isFinite(computed.metrics.clientElapsedMs))
    assert.ok(computed.metrics.ciphertextBytes > 0)
    checks.push({ domain, operation: op, expected, actual, absoluteError: Math.abs(actual - expected),
      tolerance: domain === 'int' ? 0 : 0.01, metrics: computed.metrics, passed: true })
    return computed.handle
  }
  const sum = await verify('add', [0,1], 'int', 42)
  await verify('sub', [0,1], 'int', 8)
  await verify('mul', [0,1], 'int', 425)
  await verify('div', [0,1], 'int', 1)
  const floatSum = await verify('add', [2,3], 'float', 10)
  await verify('sub', [2,3], 'float', 5)
  await verify('mul', [2,3], 'float', 18.75)
  await verify('div', [2,3], 'float', 3)
  await verify('div', [], 'float', 5, [floatSum, inputs[4].handle])
  await verify('mul', [], 'int', 714, [sum, inputs[1].handle])
  const weightedA = await verify('mul', [2,4], 'float', 15)
  const weightedB = await verify('mul', [3,4], 'float', 5)
  await verify('add', [], 'float', 20, [weightedA, weightedB])
  const released = await tool('fhe_release', { handles: inputs.map(x => x.handle) })
  assert.equal(released.released, 5)
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), tlsVerified: true, actualMcpStdio: true,
    checks, productionReady: false, confidentialityVerified: false, keyConfigurationChanged: false }, null, 2))
} finally { await client.close() }
