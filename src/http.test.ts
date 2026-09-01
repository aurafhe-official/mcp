import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bin = path.join(root, 'dist', 'index.js')

test('http healthz is load-balancer ready', async (t) => {
  if (!existsSync(bin)) {
    t.skip('dist/index.js missing — run npm run build')
    return
  }
  const port = 18787
  const child = spawn(process.execPath, [bin, '--http', '--port', String(port)], {
    cwd: root,
    env: { ...process.env, AFHE_API_URL: 'https://127.0.0.1:1' },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let err = ''
  child.stderr!.setEncoding('utf8')
  child.stderr!.on('data', (chunk: string) => {
    err += chunk
  })
  const start = Date.now()
  while (!err.includes('AURA MCP')) {
    if (Date.now() - start > 15_000) {
      child.kill('SIGTERM')
      throw new Error(`http server did not start: ${err}`)
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  try {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`)
    assert.equal(res.status, 200)
    assert.equal((await res.json() as { service: string }).service, 'aura-mcp')
  } finally {
    child.kill('SIGTERM')
  }
})
