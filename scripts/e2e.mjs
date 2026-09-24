// End-to-end: reference coprocessor -> MCP stdio -> seal CSV -> sum/scale -> reveal (cross-checked) -> proof.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

const port = 8790, home = await mkdtemp(path.join(tmpdir(), 'aura-e2e-'))
const cop = spawn(process.execPath, ['dist/reference/server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'ignore', 'inherit'] })
await new Promise(r => setTimeout(r, 1500))
const env = { ...process.env, AURA_HOME: home, AURA_COPROCESSOR_URL: `http://127.0.0.1:${port}` }
const client = new Client({ name: 'e2e', version: '1' })
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['dist/index.js'], env, stderr: 'pipe' }))
  const tool = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); assert.ok(!r.isError, `${name}: ${r.content[0].text}`); return JSON.parse(r.content[0].text) }
  assert.deepEqual((await client.listTools()).tools.map(t => t.name).sort(), ['aura_compute','aura_forget','aura_journal','aura_list','aura_proof','aura_reveal','aura_seal_csv','aura_seal_values','aura_status'])
  const st = await tool('aura_status'); assert.equal(st.serverHoldsSecretKey, false)
  const sealed = await tool('aura_seal_csv', { file: path.resolve('examples/data/payroll.csv'), column: 'salary', label: 'payroll' })
  assert.equal(sealed.rows, 8)
  const sum = await tool('aura_compute', { op: 'sum', handles: sealed.handles })
  const mean = await tool('aura_compute', { op: 'scale', handles: [sum.handle], constants: [1 / 8] })
  const r = await tool('aura_reveal', { handle: mean.handle })
  assert.ok(Math.abs(r.value - 9481.25) < 0.01, `mean ${r.value}`); assert.ok(r.crossCheck.pass)
  const blocked = await client.callTool({ name: 'aura_reveal', arguments: { handle: sealed.handles[2] } })
  assert.ok(blocked.isError && blocked.content[0].text.includes('RAW_INPUT_REVEAL_BLOCKED'))
  const app = await tool('aura_seal_values', { label: 'applicant', values: [72, 88, 60] })
  const score = await tool('aura_compute', { op: 'weighted_sum', handles: app.handles, constants: [0.4, 0.35, 0.25] })
  const s = await tool('aura_reveal', { handle: score.handle }); assert.ok(Math.abs(s.value - 74.6) < 0.01)
  const proof = await tool('aura_proof'); assert.equal(proof.passed, proof.total, JSON.stringify(proof.checks.filter(c => !c.pass)))
  console.log(JSON.stringify({ ok: true, mean: r.value, score: s.value, proof: `${proof.passed}/${proof.total}` }))
} finally { await client.close(); cop.kill() }
