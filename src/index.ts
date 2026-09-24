#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { homedir } from 'node:os'
import path from 'node:path'
import { AuraError, VERSION } from './contracts.js'
import { configuredCoprocessor } from './coprocessor.js'
import { readBundle, resultWriter } from './artifacts.js'
import { FheSession } from './fhe.js'
import { createFheServer } from './server.js'

const install = 'github:aurafhe-official/mcp#rebuild/owner-controlled-mcp'
const help = `AURA MCP ${VERSION} — diagnostic preview (synthetic data only)
  aura-fhe-mcp                    Start the MCP tool connection
  aura-fhe-mcp --demo             Enable fixed public example inputs
  aura-fhe-mcp --check            Check HTTPS and available operations
  aura-fhe-mcp --config cursor    Print host settings (also: claude, vscode)
  aura-fhe-mcp --config cursor --demo
  aura-fhe-mcp --version

Node.js 20+ and Git are needed for installation from GitHub.
The demo uses 25, 17, 7.5, 2.5 and 2. No keys or engine installation needed.
Optional AURA_COPROCESSOR_URL and AURA_ACCESS_TOKEN configure the remote service.
AURA_INPUT_BUNDLE selects an encrypted input file, outside model context.
Bundle mode requires AURA_ACCESS_TOKEN and a compute-only worker with matching key ID.
AURA_RESULT_DIR selects an absolute output directory (default: ~/.aura-mcp/results).
Confidentiality and production release remain blocked; see SECURITY.md.
`
async function main() {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--version') { console.log(VERSION); return }
  if (args.length === 1 && args[0] === '--help') { console.log(help); return }
  const demo = args.includes('--demo')
  if (args[0] === '--config' && ['cursor','claude','vscode'].includes(args[1]) && (args.length === 2 || (args.length === 3 && args[2] === '--demo'))) {
    const windows = process.platform === 'win32'
    const config = { command: windows ? 'cmd' : 'npx', args: [...(windows ? ['/d','/c','npx'] : []), '-y', install, ...(demo ? ['--demo'] : [])] }
    console.log(JSON.stringify(args[1] === 'vscode' ? { servers: { aura: { type: 'stdio', ...config } } } : { mcpServers: { aura: config } }, null, 2))
    return
  }
  if (args.length && !(args.length === 1 && ['--demo','--check'].includes(args[0]))) throw new AuraError('USE_HELP_FOR_SUPPORTED_OPTIONS')
  const coprocessor = configuredCoprocessor()
  const writeResult = resultWriter(process.env.AURA_RESULT_DIR ?? path.join(homedir(), '.aura-mcp', 'results'))
  if (args[0] === '--check') {
    const session = new FheSession(coprocessor, { writeResult })
    console.log(JSON.stringify({ ...await session.status(), ...await session.ops() }, null, 2)); return
  }
  if (demo && process.env.AURA_INPUT_BUNDLE) throw new AuraError('DEMO_AND_BUNDLE_CONFLICT')
  if (process.env.AURA_INPUT_BUNDLE && !process.env.AURA_ACCESS_TOKEN) throw new AuraError('BUNDLE_CREDENTIAL_REQUIRED')
  const bundle = process.env.AURA_INPUT_BUNDLE ? await readBundle(process.env.AURA_INPUT_BUNDLE) : undefined
  if (demo) console.error('AURA MCP: fixed synthetic demo; no confidential data. Results remain encrypted.')
  serveStdio(() => createFheServer(new FheSession(coprocessor, { bundle, writeResult,
    ...(demo ? { demo: (signal?: AbortSignal) => coprocessor.demoBundle(signal) } : {}) })), {
    transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 64 * 1024 }),
    onerror: () => console.error('AURA MCP: transport error.'),
  })
}
main().catch(e => {
  console.error(`AURA MCP: ${e instanceof AuraError ? e.code : 'CONFIGURATION_OR_CONNECTION_FAILED'}. See --help or docs/QUICKSTART.md.`)
  process.exitCode = 1
})
