#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { AuraError, VERSION } from './contracts.js'
import { configuredCoprocessor } from './coprocessor.js'
import { FheSession } from './fhe.js'
import { createFheServer } from './server.js'

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 1 && args[0] === '--version') { console.log(VERSION); return }
  if (args.length) throw new AuraError('STDIO_ONLY')
  const { coprocessor, key } = configuredCoprocessor()
  // Each transport connection receives a separate service session.
  serveStdio(() => createFheServer(new FheSession(coprocessor, key)), {
    transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 64 * 1024 }),
    onerror: () => console.error('AURA MCP: transport error.'),
  })
}
main().catch(e => {
  console.error(`AURA MCP: ${e instanceof AuraError ? e.code : 'CONFIGURATION_INVALID'}`)
  process.exitCode = 1
})
