#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { createInterface } from 'node:readline'
import path from 'node:path'
import { AuraError, VERSION } from './contracts.js'
import { buildContext } from './context.js'
import { createServer } from './server.js'
import { sealCsv, sealValues } from './session.js'
import { runProof } from './proof.js'

const HELP = `AURA MCP ${VERSION} - encrypted compute for AI agents

  aura-fhe                                  start the MCP server (stdio)
  aura-fhe status                           coprocessor health + local key fingerprint
  aura-fhe seal --label NAME                type private numbers (hidden), encrypt locally
  aura-fhe seal --file F.csv --column C     encrypt one CSV column locally
  aura-fhe proof [--secret]                 run the live FHE proof suite (optionally on a hidden number you choose)
  aura-fhe journal                          everything this machine ever sent to the coprocessor
  aura-fhe config cursor|claude|codex|vscode

Env: AURA_COPROCESSOR_URL (default http://127.0.0.1:8787), AURA_ACCESS_TOKEN, AURA_HOME (default ~/.aura)
Local reference coprocessor for development: aura-reference-coprocessor (http://127.0.0.1:8787)`

const flag = (args: string[], name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }

function hidden(prompt: string) {
  return new Promise<string>(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream }
    out._writeToOutput = (s: string) => { if (s.includes(prompt)) out.output.write(s) }
    rl.question(prompt, a => { rl.close(); process.stdout.write('\n'); resolve(a) })
  })
}

function config(host: string) {
  const cmd = { command: process.execPath, args: [path.resolve(process.argv[1])],
    env: { AURA_COPROCESSOR_URL: process.env.AURA_COPROCESSOR_URL ?? 'http://127.0.0.1:8787' } }
  if (host === 'codex') return `[mcp_servers.aura_reference]\ncommand = ${JSON.stringify(cmd.command)}\nargs = ${JSON.stringify(cmd.args)}\n[mcp_servers.aura_reference.env]\nAURA_COPROCESSOR_URL = ${JSON.stringify(cmd.env.AURA_COPROCESSOR_URL)}`
  if (host === 'vscode') return JSON.stringify({ servers: { aura_reference: { type: 'stdio', ...cmd } } }, null, 2)
  return JSON.stringify({ mcpServers: { aura_reference: cmd } }, null, 2)
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  if (cmd === '--help' || cmd === 'help') return console.log(HELP)
  if (cmd === '--version') return console.log(VERSION)
  if (cmd === 'config') return console.log(config(args[0] ?? 'cursor'))
  const c = await buildContext()
  if (!cmd) {
    return serveStdio(() => createServer(c), { transport: new StdioServerTransport(process.stdin, process.stdout),
      onerror: () => console.error('AURA MCP: transport error') })
  }
  if (cmd === 'status') {
    const h = await c.remote.health()
    return console.log(JSON.stringify({ endpoint: c.remote.endpoint, ...h, localKeyFingerprint: c.crypto.fingerprint().slice(0, 16) }, null, 2))
  }
  if (cmd === 'seal') {
    const file = flag(args, '--file'), label = flag(args, '--label')
    if (file) return console.log(JSON.stringify(await sealCsv(c, path.resolve(file), flag(args, '--column') ?? '', label), null, 2))
    if (!label) throw new AuraError('LABEL_REQUIRED', 'aura-fhe seal --label NAME')
    const raw = await hidden(`Numbers for "${label}" (comma-separated, hidden): `)
    const values = raw.split(',').map(v => Number(v.trim()))
    if (!values.length || values.some(v => !Number.isFinite(v))) throw new AuraError('NUMBERS_ONLY')
    const items = await sealValues(c, label, values)
    return console.log(`Sealed ${items.length} value(s) as "${label}". Only ciphertext is stored; the agent will see handles, never values.`)
  }
  if (cmd === 'proof') {
    const secret = args.includes('--secret') ? Number(await hidden('Pick a public synthetic test number (its derived results are shown): ')) : undefined
    const r = await runProof(c, { secret })
    console.log(`\nReference functional checks  ${r.passed}/${r.total} passed   engine: ${r.engine}   endpoint: ${r.endpoint}\n`)
    for (const k of r.checks) console.log(`${k.pass ? 'PASS' : 'FAIL'}  ${k.claim}\n      ${JSON.stringify(k.evidence)}\n`)
    process.exitCode = r.passed === r.total ? 0 : 1; return
  }
  if (cmd === 'journal') {
    const all = await c.journal.all()
    for (const e of all) console.log(`${e.at}  ${e.method} ${e.path}  out ${e.bytesOut}B  [${e.kinds.join(', ')}]  sha256 ${e.sha256.slice(0, 16)}`)
    return console.log(`\n${all.length} requests, ${all.reduce((n, e) => n + e.bytesOut, 0)} bytes sent. This metadata journal is not a complete key-egress audit.`)
  }
  console.log(HELP); process.exitCode = 1
}

main().catch(e => {
  console.error(e instanceof AuraError ? `AURA: ${e.code}${e.hint ? ` - ${e.hint}` : ''}` : `AURA: ${(e as Error).message}`)
  process.exitCode = 1
})
