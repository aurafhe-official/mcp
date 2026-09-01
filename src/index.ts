#!/usr/bin/env node
import { createServer } from 'node:http'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createFheServer } from './server.js'
import { envCoprocessor, FheSession, DEFAULT_COPROCESSOR_URL } from './fhe.js'

async function main() {
  const coprocessor = envCoprocessor()
  try {
    await coprocessor.connect()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`AURA MCP: backend not ready (${message}). Tools will retry on call.`)
  }

  const session = new FheSession(coprocessor)
  const factory = () => createFheServer(session)

  if (process.argv.includes('--http')) {
    const idx = process.argv.indexOf('--port')
    const port = Number(idx >= 0 ? process.argv[idx + 1] : process.env.PORT ?? 8787)
    const handler = createMcpHandler(factory)
    createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      res.setHeader(
        'Access-Control-Allow-Headers',
        'content-type, accept, mcp-session-id, mcp-protocol-version, last-event-id',
      )
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }
      const path = req.url?.split('?')[0] ?? '/'
      if (req.method === 'GET' && (path === '/healthz' || path === '/health')) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', service: 'aura-mcp' }))
        return
      }
      const chunks: Buffer[] = []
      req.on('data', (chunk) => chunks.push(chunk as Buffer))
      req.on('end', () => {
        void (async () => {
          const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
            else if (Array.isArray(value)) headers.set(key, value.join(', '))
          }
          const body = Buffer.concat(chunks)
          const init: RequestInit & { duplex?: 'half' } = { method: req.method, headers }
          if (body.length > 0 && req.method !== 'GET' && req.method !== 'HEAD') {
            init.body = body
            init.duplex = 'half'
          }
          const response = await handler.fetch(new Request(url, init))
          res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
          res.end(Buffer.from(await response.arrayBuffer()))
        })()
      })
    }).listen(port, '0.0.0.0', () => {
      console.error(`AURA MCP on http://0.0.0.0:${port}/mcp`)
    })
    return
  }

  serveStdio(factory)
  console.error(`AURA MCP → ${process.env.AFHE_API_URL ?? DEFAULT_COPROCESSOR_URL}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
